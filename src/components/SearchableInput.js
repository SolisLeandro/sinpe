import React, { useState } from 'react'
import { View, TextInput, FlatList, Text, TouchableOpacity, StyleSheet } from 'react-native'
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { setLocalStorageContacts } from '../functions/functions'

const SearchableInput = ({ data, placeholder, onSelect, localContacts, setLocalContacts, searchQuery, setSearchQuery }) => {
  const [filteredData, setFilteredData] = useState([])
  const [show, setShow] = useState(false)
  const [selected, setSelected] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [newContact, setNewContact] = useState(null)

  const verifyNewNumber = (text) => {
    const regex = /^([^:]+)\s*:\s*(\d{8})$/;
    const match = text.match(regex)


    if (match) {
      setNewContact({ name: match[1].trim(), number: match[2] })
    } else {
      setNewContact(null)
    }
  }

  const handleSearch = (text) => {
    setShow(true)
    setSelected(false)
    onSelect(null)

    verifyNewNumber(text)

    setSearchQuery(text)
    if (!text.trim()) {
      setFilteredData([])
      return
    }
    var filtered = data.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase()) ||
      item.number.toLowerCase().includes(text.toLowerCase())
    )
    var localContactsFiltered = localContacts.filter((item) =>
      item.name.toLowerCase().includes(text.toLowerCase()) ||
      item.number.toLowerCase().includes(text.toLowerCase())
    )
    setFilteredData([...filtered, ...localContactsFiltered])
  }

  const handleSelect = (item) => {
    setNewContact(null)
    setShow(false)
    setSelected(true)
    onSelect(item)
    setSearchQuery(item.name + ": " + item.number)
  }

  const clearSearch = () => {
    setNewContact(null)
    setShow(false)
    setSelected(false)
    onSelect(null)
    setSearchQuery("")
    setFilteredData([])
  }

  const addNew = () => {
    setShow(false)
    setSelected(true)
    onSelect(newContact)
    setSearchQuery(newContact.name + ": " + newContact.number)
    var localContactsCopy = [...localContacts]
    localContactsCopy.push({ type: "local", name: newContact.name, number: newContact.number })
    setLocalContacts(localContactsCopy)
    setLocalStorageContacts(localContactsCopy)
    setNewContact(null)
    setFilteredData([])
  }

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          placeholder={placeholder}
          value={searchQuery}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChangeText={handleSearch}
          style={[styles.input, selected ? styles.selected : null]}
        />
        <View style={styles.buttonsContainer}>
          {isFocused && searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => clearSearch()} style={styles.button}>
              <MaterialIcons name="cancel" size={24} color="#d4d4d4" />
            </TouchableOpacity>
          )}
          {newContact && (
            <TouchableOpacity onPress={() => addNew()} style={styles.button}>
              <MaterialIcons name="control-point-duplicate" size={24} color="#d4d4d4" />
            </TouchableOpacity>
          )}
        </View>
      </View>
      {show ?
        <View style={styles.listContainer}>
          <FlatList
            data={filteredData}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.item} onPress={() => handleSelect(item)}>
                {item.type == "contact" ?
                  <MaterialIcons name="person" size={20} color="#8cbef5" /> :
                  <MaterialIcons name="person" size={20} color="#a0eba6" />}
                <Text>{item.name + ": " + item.number}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
        : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row'
  },
  input: {
    flex: 1,
    height: 40,
    padding: 10,
    borderColor: '#d4d4d4',
    borderBottomWidth: 1,
  },
  selected: {
    color: "#16499c"
  },
  listContainer: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 2,
    backgroundColor: 'white',
    borderRadius: 5,
    maxHeight: 280
  },
  item: {
    flexDirection: 'row',
    gap: 5,
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d4d4d4',
  },
  buttonsContainer: {
    flexDirection: "row",
    position: "absolute",
    right: 0
  },
  button: {
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  clearText: {
    fontSize: 18,
  },
})

export default SearchableInput;
