import React, { useEffect } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import * as LocalAuthentication from 'expo-local-authentication'
import { useNavigation } from '@react-navigation/native'

import logo from '../../assets/SinpeDiablazoLogo.png'

export default function Authentication() {
  const navigation = useNavigation();

  const authenticate = async () => {
    const { success } = await LocalAuthentication.authenticateAsync()
    if (success) {
      navigation.replace("Home")
    }
  }

  useEffect(() => {
    authenticate()
  }, [])

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image source={logo} style={styles.logo} />
      </View>
      <TouchableOpacity style={styles.button} onPress={authenticate}>
        <Text style={styles.buttonText}>Reintentar</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    height: 40,
    width: 90,
    borderRadius: 5,
    backgroundColor: "#16499c"
  },
  buttonText: {
    color: "#fff"
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
})
