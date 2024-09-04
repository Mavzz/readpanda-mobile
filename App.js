import { useState } from 'react'
import { StyleSheet, Text, View, Button, Alert } from 'react-native';

export default function App() {

  const [] = useState('');
  
  function buttonClicked(){
    console.log("Button has been clicked");
    Alert.alert('Button has been clicked');
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View
          style={{
            flex: 1
          }}>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.text}>ReadPanda</Text>
        </View>
        <View style={styles.searchButton}>
          <Button title="Search" color="#FFFF00" onPress={buttonClicked} />
        </View>
      </View>

      <View>
        <Text style={{ color: '#e74c3c' }}>Sample texrt</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000000',
    flex: 1,
    flexDirection: 'column',
  },
  headerContainer:{
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 0,
    flexDirection: 'row',
    maxHeight: 90,
  },
  titleContainer:{
    flex: 3,
    alignItems: 'center',
    borderColor: "#ffffff",
    borderWidth: 1,
  },
  searchButton: {
    flex: 1,
    
  },
  text: {
    color: '#e74c3c',
    fontSize: "26px",
  },
});
