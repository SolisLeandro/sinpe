import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, ActivityIndicator, TouchableOpacity, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import * as MediaLibrary from 'expo-media-library';

import { getUniqueNumbers, getLocalStorageContacts, showAlert, sendSMS, sendSMSAndWaitForResponse } from '../functions/functions';
import SearchableInput from '../components/SearchableInput';
import MoneyInput from '../components/MoneyInput';
import ProviderMenu from '../components/ProviderMenu';
import ReceiptModal from '../components/ReceiptModal';

import logo from '../../assets/SinpeDiablazoLogo.png';

export default function Home({ navigation }) {
    const [contacts, setContacts] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [localContacts, setLocalContacts] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [buttonState, setButtonState] = useState("DISABLED");
    const [amount, setAmount] = useState("");
    const [motive, setMotive] = useState("");
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState("6223-2450");
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [receiptModalVisible, setReceiptModalVisible] = useState(false);
    const [receiptData, setReceiptData] = useState(null);

    const handleSelectItem = (item) => {
        setSelectedItem(item);
        console.log('Seleccionado:', item);
    };

    const clearVariables = () => {
        setButtonState("DISABLED");
        setAmount("");
        setMotive("");
        setSearchQuery("");
        setSelectedItem(null);
    }

    const handleConfigureProviders = () => {
        navigation.navigate('ProviderConfig');
    };

    const extractReceiptData = (response) => {
        try {
            // Extraer datos de la respuesta usando regex
            const amountMatch = response.match(/(\d{1,3}(?:[,\.]\d{3})*(?:[,\.]\d{2})?)\s*colones?/i);
            const phoneMatch = response.match(/al\s+(\d{8})/i);
            const nameMatch = response.match(/de\s+([^,]+)/i);
            const receiptMatch = response.match(/comprobante\s+(\d+)/i);
            
            return {
                amount: amountMatch ? amountMatch[1] : null,
                phone: phoneMatch ? phoneMatch[1] : null,
                name: nameMatch ? nameMatch[1].trim() : null,
                receipt: receiptMatch ? receiptMatch[1] : null
            };
        } catch (error) {
            console.error('Error extracting receipt data:', error);
            return null;
        }
    };

    const requestPermissions = async () => {
        try {
            // Solicitar permisos de contactos
            const contactsPermission = await Contacts.requestPermissionsAsync();
            
            // Solicitar permisos de SMS (solo en Android)
            let smsPermission = { status: 'granted' };
            if (Platform.OS === 'android') {
                smsPermission = await request(PERMISSIONS.ANDROID.SEND_SMS);
            }
            
            // Solicitar permisos de media library
            const mediaPermission = await MediaLibrary.requestPermissionsAsync();
            
            // Verificar si todos los permisos fueron concedidos
            const allPermissionsGranted = 
                contactsPermission.status === 'granted' &&
                (Platform.OS === 'ios' || smsPermission === RESULTS.GRANTED) &&
                mediaPermission.status === 'granted';
            
            if (!allPermissionsGranted) {
                Alert.alert(
                    'Permisos requeridos',
                    'Esta aplicación necesita permisos para acceder a contactos, enviar SMS y guardar imágenes para funcionar correctamente.',
                    [{ text: 'OK' }]
                );
            }
            
            return allPermissionsGranted;
        } catch (error) {
            console.error('Error requesting permissions:', error);
            return false;
        }
    };

    const generateReceiptImage = async (extractedReceiptData, originalAmount, destinationPhone, motive) => {
        setReceiptData({
            ...extractedReceiptData,
            amount: originalAmount,
            destinationPhone,
            motive
        });
        setReceiptModalVisible(true);
    };

    const handleSendSMS = async () => {
        const cleanAmount = amount.replace(/₡/g, "").replace(/\s/g, "");
        const SMSText = 'PASE ' + cleanAmount + " " + selectedItem.number + " " + motive;
        setButtonState("WAIT");
        try {
            console.log('Attempting to send SMS...');
            const response = await sendSMSAndWaitForResponse(SMSText, selectedProvider);
            console.log('SMS Response:', response);
            
            // Verificar si la respuesta es exitosa
            const isSuccess = response && 
                             response.toLowerCase().includes('ha pasado') && 
                             response.toLowerCase().includes('comprobante');
            
            if (isSuccess) {
                const extractedReceiptData = extractReceiptData(response);
                const hasReceiptData = extractedReceiptData && extractedReceiptData.receipt && extractedReceiptData.name;
                
                if (hasReceiptData) {
                    // Ir directo al modal del comprobante
                    clearVariables();
                    generateReceiptImage(extractedReceiptData, amount, selectedItem.number, motive);
                } else {
                    // Si no hay datos del comprobante, mostrar alerta simple
                    Alert.alert('Éxito', `Transferencia exitosa: ${response}`, [
                        { text: 'Cerrar', onPress: () => clearVariables() }
                    ]);
                }
            } else {
                Alert.alert('Error', `Transferencia falló: ${response}`);
                setButtonState("AVAILABLE");
            }
        } catch (error) {
            console.error('Error in handleSendSMS:', error);
            Alert.alert('Error', error.message || 'An unknown error occurred');
            setButtonState("AVAILABLE");
        }
    };

    const getContacts = async () => {
        var localStorageContacts = await getLocalStorageContacts();
        setLocalContacts(localStorageContacts);
        
        try {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
            });

            var mappedData = [];

            for (let index = 0; index < data.length; index++) {
                const element = data[index];

                if (element.phoneNumbers) {
                    var uniqueNumbers = getUniqueNumbers(element.phoneNumbers);
                    uniqueNumbers.forEach(number => {
                        mappedData.push({ type: "contact", name: element.name, number });
                    });
                }
            }

            if (mappedData.length > 0) {
                setContacts(mappedData);
            }
        } catch (error) {
            console.error('Error loading contacts:', error);
        }
    };

    const defaultProviders = [
        { label: "Promerica", value: "6223-2450" },
        { label: "BAC", value: "1222" },
        { label: "BCR", value: "2276" },
        { label: "BN", value: "2627" },
    ];

    const loadSavedProvider = async () => {
        try {
            // Load all providers from new storage format
            const savedProviders = await AsyncStorage.getItem('allProviders');
            let allProviders = [...defaultProviders];

            if (savedProviders !== null) {
                allProviders = JSON.parse(savedProviders);
            } else {
                // Fallback: check for old customProviders format
                const oldCustomProviders = await AsyncStorage.getItem('customProviders');
                if (oldCustomProviders !== null) {
                    const customProviders = JSON.parse(oldCustomProviders);
                    allProviders = [...defaultProviders, ...customProviders];
                    // Migrate to new format
                    await AsyncStorage.setItem('allProviders', JSON.stringify(allProviders));
                    await AsyncStorage.removeItem('customProviders');
                }
            }

            // Load selected provider
            const savedProvider = await AsyncStorage.getItem('selectedProvider');
            if (savedProvider !== null) {
                // Check if the selected provider still exists
                const providerExists = allProviders.some(p => p.value === savedProvider);
                if (providerExists) {
                    setSelectedProvider(savedProvider);
                } else {
                    // If selected provider was deleted, set to first available
                    const firstProvider = allProviders[0];
                    if (firstProvider) {
                        setSelectedProvider(firstProvider.value);
                        await AsyncStorage.setItem('selectedProvider', firstProvider.value);
                    }
                }
            } else if (allProviders.length > 0) {
                // No provider selected, set to first one
                setSelectedProvider(allProviders[0].value);
                await AsyncStorage.setItem('selectedProvider', allProviders[0].value);
            }
        } catch (error) {
            console.error('Error loading provider from AsyncStorage:', error);
            // Fallback to first default provider
            setSelectedProvider(defaultProviders[0].value);
        }
    };

    useEffect(() => {
        const initializeApp = async () => {
            await requestPermissions();
            await getContacts();
            await loadSavedProvider();
        };
        
        initializeApp();
    }, []);

    // Refresh provider when returning from config screen
    useFocusEffect(
        React.useCallback(() => {
            loadSavedProvider();
            // Force refresh of ProviderMenu
            setRefreshTrigger(prev => prev + 1);
        }, [])
    );

    useEffect(() => {
        if (selectedItem !== null && amount !== "" && motive !== "" && motive.length >= 5) {
            setButtonState("AVAILABLE");
        } else {
            setButtonState("DISABLED");
        }
    }, [selectedItem, amount, motive]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.logoContainer}>
                <Image source={logo} style={styles.logo} />
            </View>
            <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                    <Text style={styles.formText}>Número</Text>
                    <SearchableInput
                        data={contacts}
                        placeholder="Buscar..."
                        onSelect={handleSelectItem}
                        localContacts={localContacts}
                        setLocalContacts={setLocalContacts}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.formText}>Monto</Text>
                    <MoneyInput amount={amount} setAmount={setAmount} />
                </View>
                <View style={styles.inputContainer}>
                    <Text style={styles.formText}>Motivo</Text>
                    <TextInput
                        placeholder="Ingrese un motivo"
                        value={motive}
                        onChangeText={(v) => setMotive(v)}
                        style={styles.input}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.button, buttonState == "DISABLED" ? styles.buttonDisabled : null]}
                    disabled={buttonState == "DISABLED"}
                    onPress={handleSendSMS}
                >
                    {buttonState == "WAIT" ? (
                        <ActivityIndicator size="small" color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Enviar</Text>
                    )}
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuButton} onPress={() => setIsMenuOpen(true)}>
                <MaterialIcons name="menu" size={24} color="#16499c" />
            </TouchableOpacity>

            <ProviderMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                selectedProvider={selectedProvider}
                setSelectedProvider={setSelectedProvider}
                onConfigureProviders={handleConfigureProviders}
                refreshTrigger={refreshTrigger}
            />

            {receiptData && (
                <ReceiptModal
                    visible={receiptModalVisible}
                    onClose={() => setReceiptModalVisible(false)}
                    receiptData={receiptData}
                    amount={receiptData.amount}
                    destinationPhone={receiptData.destinationPhone}
                    motive={receiptData.motive}
                />
            )}

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
        marginTop: 60,
        alignItems: 'flex-start',
        gap: 15,
        zIndex: 1,
        paddingHorizontal: 40
    },
    logo: {
        height: 150,
        aspectRatio: 1,
        resizeMode: 'contain',
    },
    logoContainer: {
        width: "100%",
        alignItems: 'center'
    },
    formText: {
        color: "#4d4d4d",
        marginLeft: 10,
    },
    formContainer: {
        width: "100%",
        gap: 25,
        alignItems: 'center'
    },
    inputContainer: {
        width: "100%"
    },
    input: {
        height: 40,
        padding: 10,
        borderColor: '#d4d4d4',
        borderBottomWidth: 1,
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        width: 90,
        borderRadius: 5,
        backgroundColor: "#16499c"
    },
    buttonDisabled: {
        backgroundColor: "#a7a7a8"
    },
    buttonText: {
        color: "#fff"
    },
    menuButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 10,
    },
});