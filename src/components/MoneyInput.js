import React, { useState } from 'react'
import { TextInput, StyleSheet } from 'react-native'

const MoneyInput = ({amount, setAmount}) => {

    const handleNumberInput = (value) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        
        const number = parseFloat(numericValue);
        
        if (isNaN(number)) {
            setAmount("");
        } else {
            const formattedValue = "₡ " + number.toLocaleString();
            setAmount(formattedValue);
        }
    }

    return (
        <TextInput
            placeholder="Ingrese un monto"
            value={amount}
            onChangeText={handleNumberInput}
            style={styles.input}
            keyboardType="numeric"
        />
    )
}

const styles = StyleSheet.create({
    input: {
        height: 40,
        padding: 10,
        borderColor: '#d4d4d4',
        borderBottomWidth: 1,
    }
});

export default MoneyInput;
