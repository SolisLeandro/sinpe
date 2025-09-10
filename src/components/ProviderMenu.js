import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProviderMenu = ({ isOpen, onClose, selectedProvider, setSelectedProvider, onConfigureProviders, refreshTrigger }) => {
    const screenWidth = Dimensions.get('window').width;
    const menuWidth = screenWidth * 0.7;
    const slideAnim = useRef(new Animated.Value(menuWidth)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const [providers, setProviders] = useState([]);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    
    const defaultProviders = [
        { label: "Promerica", value: "6223-2450" },
        { label: "BAC", value: "1222" },
        { label: "BCR", value: "2276" },
        { label: "BN", value: "2627" },
    ];

    useEffect(() => {
        if (isOpen) {
            // Always reload providers when menu opens to get fresh data
            loadProviders();
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [isOpen]);

    // Reload providers when refreshTrigger changes
    useEffect(() => {
        loadProviders();
    }, [refreshTrigger]);

    const loadProviders = async () => {
        try {
            const savedProviders = await AsyncStorage.getItem('allProviders');
            if (savedProviders !== null) {
                const allProviders = JSON.parse(savedProviders);
                setProviders(allProviders);
            } else {
                // Fallback: check for old customProviders format
                const oldCustomProviders = await AsyncStorage.getItem('customProviders');
                if (oldCustomProviders !== null) {
                    const customProviders = JSON.parse(oldCustomProviders);
                    const allProviders = [...defaultProviders, ...customProviders];
                    setProviders(allProviders);
                    // Migrate to new format
                    await AsyncStorage.setItem('allProviders', JSON.stringify(allProviders));
                    await AsyncStorage.removeItem('customProviders');
                } else {
                    setProviders(defaultProviders);
                    await AsyncStorage.setItem('allProviders', JSON.stringify(defaultProviders));
                }
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            setProviders(defaultProviders);
        }
    };

    const handleProviderChange = async (itemValue) => {
        setSelectedProvider(itemValue);
        setDropdownOpen(false);
        try {
            await AsyncStorage.setItem('selectedProvider', itemValue);
        } catch (error) {
            console.error('Error saving provider to AsyncStorage:', error);
        }
    };

    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    const getSelectedProviderLabel = () => {
        const provider = providers.find(p => p.value === selectedProvider);
        return provider ? provider.label : 'Seleccionar proveedor';
    };

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: menuWidth,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            onClose();
        });
    };

    return (
        <>
            {isOpen && (
                <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
                    <TouchableOpacity 
                        style={styles.overlayTouchable}
                        activeOpacity={1} 
                        onPress={handleClose}
                    />
                </Animated.View>
            )}
            
            <Animated.View style={[styles.menuContainer, { 
                transform: [{ translateX: slideAnim }] 
            }]}>
                <Text style={styles.menuTitle}>Seleccionar Proveedor</Text>
                <View style={styles.dropdownContainer}>
                    <TouchableOpacity style={styles.dropdownButton} onPress={toggleDropdown}>
                        <Text style={styles.dropdownButtonText}>{getSelectedProviderLabel()}</Text>
                        <MaterialIcons 
                            name={dropdownOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                            size={24} 
                            color="#666" 
                        />
                    </TouchableOpacity>
                    {dropdownOpen && (
                        <View style={styles.dropdownList}>
                            {providers.map((provider) => (
                                <TouchableOpacity 
                                    key={provider.value} 
                                    style={[
                                        styles.dropdownItem,
                                        selectedProvider === provider.value && styles.dropdownItemSelected
                                    ]}
                                    onPress={() => handleProviderChange(provider.value)}
                                >
                                    <Text style={[
                                        styles.dropdownItemText,
                                        selectedProvider === provider.value && styles.dropdownItemTextSelected
                                    ]}>
                                        {provider.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
                
                <TouchableOpacity 
                    style={styles.configButton} 
                    onPress={() => {
                        handleClose();
                        onConfigureProviders();
                    }}
                >
                    <Text style={styles.configButtonText}>Configurar Proveedores</Text>
                </TouchableOpacity>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    overlayTouchable: {
        flex: 1,
    },
    menuContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '70%',
        backgroundColor: 'white',
        padding: 20,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    closeButton: {
        alignSelf: 'flex-end',
        paddingVertical: 10,
    },
    menuTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    dropdownContainer: {
        marginBottom: 20,
        zIndex: 1000,
    },
    dropdownButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 12,
        backgroundColor: 'white',
    },
    dropdownButtonText: {
        fontSize: 16,
        color: '#333',
    },
    dropdownList: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#ddd',
        borderTopWidth: 0,
        borderBottomLeftRadius: 5,
        borderBottomRightRadius: 5,
        maxHeight: 200,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dropdownItem: {
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    dropdownItemSelected: {
        backgroundColor: '#f0f8ff',
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#333',
    },
    dropdownItemTextSelected: {
        color: '#16499c',
        fontWeight: '500',
    },
    configButton: {
        justifyContent: 'center',
        alignItems: 'center',
        height: 40,
        width: '100%',
        borderRadius: 5,
        backgroundColor: "#16499c",
        marginTop: 20,
    },
    configButtonText: {
        color: "#fff"
    },
});

export default ProviderMenu;