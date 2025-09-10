import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TextInput, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Contacts from 'expo-contacts';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';

import { getUniqueNumbers, getLocalStorageContacts, showAlert, sendSMS, sendSMSAndWaitForResponse } from '../functions/functions';
import SearchableInput from '../components/SearchableInput';
import MoneyInput from '../components/MoneyInput';
import ProviderMenu from '../components/ProviderMenu';

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

    const handleSendSMS = async () => {
        const cleanAmount = amount.replace(/₡/g, "").replace(/\s/g, "");
        const SMSText = 'PASE ' + cleanAmount + " " + selectedItem.number + " " + motive;
        setButtonState("WAIT");
        try {
            console.log('Attempting to send SMS...');
            const response = await sendSMSAndWaitForResponse(SMSText, selectedProvider);
            console.log('SMS Response:', response);
            Alert.alert('Éxito', `Mensaje enviado y respuesta recibida: ${response}`);
            clearVariables()
        } catch (error) {
            console.error('Error in handleSendSMS:', error);
            Alert.alert('Error', error.message || 'An unknown error occurred');
            setButtonState("AVAILABLE");
        }
    };

    const getContacts = async () => {
        var localStorageContacts = await getLocalStorageContacts();
        setLocalContacts(localStorageContacts);
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
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
        getContacts();
        loadSavedProvider();
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