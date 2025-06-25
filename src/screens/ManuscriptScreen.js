import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Pdf from 'react-native-pdf';
import Background from '../components/Background';

const ManuscriptScreen = ({ route }) => {
  const { book } = route.params;
  const source = { uri: book.manuscript_url, cache: true };

  return (
    <Background>
      <View style={styles.container}>
        {/* The PDF viewer will take up the whole screen */}
        <Pdf
          trustAllCerts={false}
          source={source}
          onLoadComplete={(numberOfPages, filePath) => {
            console.log(`Number of pages: ${numberOfPages}`);
          }}
          onPageChanged={(page, numberOfPages) => {
            console.log(`Current page: ${page}`);
          }}
          onError={(error) => {
            console.log(error);
          }}
          onPressLink={(uri) => {
            console.log(`Link pressed: ${uri}`);
          }}
          style={styles.pdf}
        />
      </View>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pdf: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  progressContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  progressText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default ManuscriptScreen;