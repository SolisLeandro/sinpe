import AsyncStorage from '@react-native-async-storage/async-storage'
import { Alert } from 'react-native';
import * as SMS from 'expo-sms';

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

export async function sendSMS(text, recipient) {
  const isAvailable = await SMS.isAvailableAsync();
  if (isAvailable) {
    const { result } = await SMS.sendSMSAsync(
      [recipient],
      text
    );
    return result === 'sent';
  } else {
    console.log('SMS is not available');
    return false;
  }
}
