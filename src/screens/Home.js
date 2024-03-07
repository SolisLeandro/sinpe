import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, Image, TextInput, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Contacts from 'expo-contacts'

import { getUniqueNumbers, getLocalStorageContacts, showAlert, sendSMS } from '../functions/functions'
import SearchableInput from '../components/SearchableInput'
import MoneyInput from '../components/MoneyInput'

import logo from '../../assets/SinpeDiablazoLogo.png'
import { Button } from 'react-native'
import { TouchableOpacity } from 'react-native'

export default function Home() {
    const [contacts, setContacts] = useState([])
    const [selectedItem, setSelectedItem] = useState(null)
    const [localContacts, setLocalContacts] = useState([])
    const [searchQuery, setSearchQuery] = useState('')
    const [buttonState, setButtonState] = useState("DISABLED")
    const [amount, setAmount] = useState("")
    const [motive, setMotive] = useState("")

    const handleSelectItem = (item) => {
        setSelectedItem(item)
        console.log('Seleccionado:', item)
    }

    const handleSendSMS = async () => {
        const SMSText = 'PASE ' + amount.replaceAll("₡", "").replaceAll(" ", "") + " " + selectedItem.number + " " + motive
        setButtonState("WAIT")
        const resp = await sendSMS(SMSText, "2627")
        //console.log("resp", resp)
        //showAlert("Sinpe enviado", "", "Aceptar")
        setAmount("")
        setMotive("")
        setSearchQuery("")
        setSelectedItem(null)
    }

    const getContacts = async () => {
        var localStorageContacts = await getLocalStorageContacts()
        setLocalContacts(localStorageContacts)
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
            })

            var mappedData = []

            for (let index = 0; index < data.length; index++) {
                const element = data[index]

                if (element.phoneNumbers) {
                    var uniqueNumbers = getUniqueNumbers(element.phoneNumbers)
                    uniqueNumbers.forEach(number => {
                        mappedData.push({ type: "contact", name: element.name, number })
                    })
                }
            }

            if (mappedData.length > 0) {
                setContacts(mappedData)
            }
        }
    }

    useEffect(() => {
        getContacts()
    }, [])

    useEffect(() => {
        if (selectedItem !== null && amount !== "" && motive !== "") {
            setButtonState("AVAILABLE")
        } else {
            setButtonState("DISABLED")
        }
    }, [selectedItem, amount, motive])

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
                <TouchableOpacity style={[styles.button, buttonState == "DISABLED" ? styles.buttonDisabled : null]} disabled={buttonState == "DISABLED" ? true : false} onPress={handleSendSMS}>
                    {buttonState == "WAIT" ?
                        <ActivityIndicator size="small" color="#fff" />
                        :
                        <Text style={styles.buttonText}>Enviar</Text>
                    }

                </TouchableOpacity>
            </View>

        </SafeAreaView>
    )
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
    }
})