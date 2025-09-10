import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert, Platform, NativeModules } from 'react-native';
import * as SMS from 'expo-sms';
const { SMSSender } = NativeModules;
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export function getUniqueNumbers(contacts) {
    const numbersSet = new Set()

    contacts.forEach(contact => {
        var numberWithoutSpaces = contact.number.replace(/\s/g, '')
        var number = numberWithoutSpaces.replace('+506', '')
        numbersSet.add(number)
    })

    return [...numbersSet]
}

export async function getLocalStorageContacts() {
    const value = await AsyncStorage.getItem('LOCAL_CONTACTS')
    if (value !== null) {
        return JSON.parse(value)
    } else {
        return []
    }
}

export async function setLocalStorageContacts(contacts) {
    await AsyncStorage.setItem('LOCAL_CONTACTS', JSON.stringify(contacts))
}

export function showAlert(title, text, okText) {
    Alert.alert(title, text,
        [
            { text: okText, onPress: () => { } }
        ]
    );
}

export async function addHistorySMS(smsObject) {
    var history = await AsyncStorage.getItem('SMS_HISTORY')
    if (history !== null) {
        history = JSON.parse(history)
    } else {
        history = []
    }
    history.push(smsObject)
    await AsyncStorage.setItem('SMS_HISTORY', JSON.stringify(history))
};

const requestSMSPermission = async () => {
    if (Platform.OS === 'android') {
        const result = await request(PERMISSIONS.ANDROID.SEND_SMS);
        return result === RESULTS.GRANTED;
    }
    return true; // iOS doesn't require runtime permission for SMS
};

export async function sendSMSAndWaitForResponse(messageText, recipientNumber) {

    if (Platform.OS === 'android') {
        const isAvailable = await SMS.isAvailableAsync();
        if (isAvailable) {
            try {
                console.log('Attempting to require SMSSender module...');
                if (!SMSSender) {
                    console.error('SMSSender module is not available after requiring');
                    throw new Error('SMSSender module is not available');
                }
                console.log('SMSSender module found, attempting to send SMS...');
                return await SMSSender.sendSMSAndWaitForResponse(recipientNumber, messageText);
            } catch (error) {
                console.error('Error in sendSMSAndWaitForResponse:', error);
                throw error;
            }
        } else {
            throw new Error('SMS is not available on this device');
        }
    } else {
        return sendSMS(messageText, recipientNumber)
    }
}

export async function sendSMS(text, recipient) {
    const isAvailable = await SMS.isAvailableAsync();
    if (isAvailable) {
        const { result } = await SMS.sendSMSAsync(
            [recipient],
            text
        );
        return result === 'sent';
    } else {
        throw new Error('SMS is not available on this device');
    }
}