import React, { useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Image, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import logo from '../../assets/SinpeDiablazoLogo.png';

const ReceiptModal = ({ visible, onClose, receiptData, amount, destinationPhone, motive }) => {
    const viewShotRef = useRef();

    // Protección contra datos nulos
    if (!receiptData) {
        return null;
    }

    const captureAndSave = async () => {
        try {
            // Solicitar permisos
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Error', 'Se necesitan permisos para guardar la imagen');
                return;
            }

            // Capturar la vista
            const uri = await viewShotRef.current.capture({
                format: 'png',
                quality: 1.0,
            });

            // Guardar en la galería
            await MediaLibrary.saveToLibraryAsync(uri);
            Alert.alert('Éxito', 'Comprobante guardado en la galería');
        } catch (error) {
            console.error('Error saving receipt:', error);
            Alert.alert('Error', 'No se pudo guardar el comprobante');
        }
    };

    const displayAmount = amount && amount.startsWith('₡') ? amount : `₡${amount}`;

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                    <ViewShot ref={viewShotRef} style={styles.receiptContainer}>
                        <View style={styles.header}>
                            <Image source={logo} style={styles.logo} />
                            <Text style={styles.title}>COMPROBANTE DE TRANSFERENCIA</Text>
                        </View>
                        
                        <View style={styles.divider} />
                        
                        <View style={styles.dataContainer}>
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Monto:</Text>
                                <Text style={styles.value}>{displayAmount}</Text>
                            </View>
                            
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Destino:</Text>
                                <Text style={styles.value}>{destinationPhone}</Text>
                            </View>
                            
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Nombre:</Text>
                                <Text style={styles.value}>{receiptData.name || 'N/A'}</Text>
                            </View>
                            
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Motivo:</Text>
                                <Text style={styles.value}>{motive}</Text>
                            </View>
                            
                            <View style={styles.divider} />
                            
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Comprobante:</Text>
                                <Text style={styles.receiptNumber}>{receiptData.receipt}</Text>
                            </View>
                            
                            <View style={styles.dataRow}>
                                <Text style={styles.label}>Fecha:</Text>
                                <Text style={styles.value}>{new Date().toLocaleString('es-CR', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit',
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    hour12: true 
                                })}</Text>
                            </View>
                        </View>
                    </ViewShot>
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity style={styles.saveButton} onPress={captureAndSave}>
                            <MaterialIcons name="save" size={20} color="#fff" />
                            <Text style={styles.saveButtonText}>Guardar Imagen</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <Text style={styles.closeButtonText}>Cerrar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },
    receiptContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 20,
    },
    logo: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
        marginBottom: 10,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#16499c',
        textAlign: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 15,
    },
    dataContainer: {
        paddingVertical: 10,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    value: {
        fontSize: 14,
        color: '#666',
        flex: 2,
        textAlign: 'right',
    },
    receiptNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#16499c',
        flex: 2,
        textAlign: 'right',
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 20,
        gap: 10,
    },
    saveButton: {
        backgroundColor: '#16499c',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'center',
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    closeButton: {
        backgroundColor: '#ccc',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 5,
        flex: 1,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#333',
        fontWeight: '600',
    },
});

export default ReceiptModal;