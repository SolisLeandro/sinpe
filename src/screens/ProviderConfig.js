import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProviderConfig({ navigation }) {
    const [providers, setProviders] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newNumber, setNewNumber] = useState('');

    const defaultProviders = [
        { id: '1', label: "Promerica", value: "6223-2450" },
        { id: '2', label: "BAC", value: "1222" },
        { id: '3', label: "BCR", value: "2276" },
        { id: '4', label: "BN", value: "2627" },
    ];

    useEffect(() => {
        loadProviders();
    }, []);

    const loadProviders = async () => {
        try {
            const savedProviders = await AsyncStorage.getItem('allProviders');
            if (savedProviders !== null) {
                const allProviders = JSON.parse(savedProviders);
                setProviders(allProviders);
            } else {
                setProviders(defaultProviders);
                await AsyncStorage.setItem('allProviders', JSON.stringify(defaultProviders));
            }
        } catch (error) {
            console.error('Error loading providers:', error);
            setProviders(defaultProviders);
        }
    };

    const saveProviders = async (updatedProviders) => {
        try {
            await AsyncStorage.setItem('allProviders', JSON.stringify(updatedProviders));
        } catch (error) {
            console.error('Error saving providers:', error);
            Alert.alert('Error', 'No se pudieron guardar los proveedores');
        }
    };

    const showAddProviderForm = () => {
        setShowAddForm(true);
    };

    const addProvider = async () => {
        if (newName.trim() === '' || newNumber.trim() === '') {
            Alert.alert('Error', 'Por favor complete todos los campos');
            return;
        }

        const newProvider = {
            id: Date.now().toString(),
            label: newName.trim(),
            value: newNumber.trim()
        };

        const updatedProviders = [...providers, newProvider];
        setProviders(updatedProviders);
        await saveProviders(updatedProviders);
        
        setNewName('');
        setNewNumber('');
        setShowAddForm(false);
    };

    const cancelAdd = () => {
        setNewName('');
        setNewNumber('');
        setShowAddForm(false);
    };

    const deleteProvider = async (providerId) => {
        if (providers.length <= 1) {
            Alert.alert('Error', 'Debe mantener al menos un proveedor');
            return;
        }

        Alert.alert(
            'Confirmar eliminación',
            '¿Está seguro de que desea eliminar este proveedor?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Eliminar', 
                    style: 'destructive',
                    onPress: async () => {
                        const updatedProviders = providers.filter(p => p.id !== providerId);
                        setProviders(updatedProviders);
                        await saveProviders(updatedProviders);
                    }
                }
            ]
        );
    };

    const resetToDefault = () => {
        Alert.alert(
            'Confirmar reset',
            '¿Está seguro de que desea borrar toda la configuración y volver a los proveedores por defecto?',
            [
                { text: 'Cancelar', style: 'cancel' },
                { 
                    text: 'Reset', 
                    style: 'destructive',
                    onPress: async () => {
                        setProviders(defaultProviders);
                        await saveProviders(defaultProviders);
                        setShowAddForm(false);
                        setNewName('');
                        setNewNumber('');
                    }
                }
            ]
        );
    };

    const renderProvider = ({ item }) => (
        <View style={styles.providerItem}>
            <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{item.label}</Text>
                <Text style={styles.providerNumber}>{item.value}</Text>
            </View>
            <TouchableOpacity 
                style={styles.deleteButton} 
                onPress={() => deleteProvider(item.id)}
            >
                <MaterialIcons name="delete" size={24} color="#ff4444" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#16499c" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Proveedores</Text>
                <TouchableOpacity onPress={showAddProviderForm}>
                    <MaterialIcons name="add" size={24} color="#16499c" />
                </TouchableOpacity>
            </View>

            {showAddForm && (
                <View style={styles.addForm}>
                    <Text style={styles.addFormTitle}>Agregar Nuevo Proveedor</Text>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Nombre:</Text>
                        <TextInput
                            value={newName}
                            onChangeText={setNewName}
                            style={styles.editInput}
                            placeholder="Nombre del proveedor"
                        />
                    </View>
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Número:</Text>
                        <TextInput
                            value={newNumber}
                            onChangeText={setNewNumber}
                            style={styles.editInput}
                            placeholder="Número del proveedor"
                            keyboardType="numeric"
                        />
                    </View>
                    <View style={styles.editActions}>
                        <TouchableOpacity style={styles.saveButton} onPress={addProvider}>
                            <Text style={styles.buttonText}>Agregar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelButton} onPress={cancelAdd}>
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <FlatList
                data={providers}
                renderItem={renderProvider}
                keyExtractor={item => item.id}
                style={styles.providersList}
                contentContainerStyle={styles.providersListContent}
            />

            <View style={styles.bottomButtons}>
                <TouchableOpacity style={styles.resetButton} onPress={resetToDefault}>
                    <MaterialIcons name="refresh" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Resetear</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        marginBottom: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
        flex: 1,
    },
    addForm: {
        marginBottom: 20,
        padding: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#f8f9fa',
        gap: 15,
    },
    addFormTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    inputContainer: {
        gap: 5,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 5,
        padding: 10,
        fontSize: 16,
    },
    editActions: {
        flexDirection: 'row',
        gap: 10,
    },
    saveButton: {
        backgroundColor: '#16499c',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#666',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
    },
    providersList: {
        flex: 1,
    },
    providersListContent: {
        paddingBottom: 20,
    },
    providerItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 15,
    },
    providerInfo: {
        flex: 1,
    },
    providerName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    providerNumber: {
        fontSize: 14,
        color: '#666',
    },
    deleteButton: {
        padding: 8,
    },
    bottomButtons: {
        paddingVertical: 20,
        paddingHorizontal: 5,
    },
    resetButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ff6b6b',
        paddingVertical: 12,
        borderRadius: 5,
        gap: 8,
    },
    buttonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});