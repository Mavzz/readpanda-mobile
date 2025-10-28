import React, { useState } from 'react';
import { requireNativeComponent, Platform, ActivityIndicator, View, StyleSheet } from 'react-native';

const LINKING_ERROR = 
  `The native module for PDF Viewer is not available. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install' in the 'ios' directory and restarted your project.\n", default: '' }) ;

// The name 'RNPdfViewer' must exactly match the RCT_EXPORT_MODULE name from RNPdfViewerManager.m
const RNPdfViewerComponent = Platform.select({
  ios: requireNativeComponent('RNPdfViewer'),
  default: () => {
    if (__DEV__) {
      console.warn(LINKING_ERROR);
    }
    return null; // Return null on unsupported platforms
  },
});

const PdfViewer = ({ pdfUrl, pdfTitle, style }) => {

  if (Platform.OS !== 'ios') {
    return <RNPdfViewerComponent />;
  }

  if (!pdfUrl) {
    return null;
  }

  return (
    <View style={style}>
      <RNPdfViewerComponent 
        style={StyleSheet.absoluteFill}
        pdfDetails={{ url: pdfUrl, title: pdfTitle }} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
});

const MemoizedPdfViewer = React.memo(PdfViewer);

export default MemoizedPdfViewer;
