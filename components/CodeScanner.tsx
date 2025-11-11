import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

interface CodeScannerProps {
  onDetected: (code: string) => void;
  hasScanned?: boolean;
}

export function CodeScanner({ onDetected, hasScanned }: CodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || hasScanned) return;

    // Create hints map with formats we want to scan
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      // Put QR code first since it was working before
      BarcodeFormat.QR_CODE,
      // Then add barcode formats
      BarcodeFormat.CODE_128,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.CODE_39,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF
    ]);

    // Add basic hints that won't interfere with QR scanning
    hints.set(DecodeHintType.TRY_HARDER, true);

    const reader = new BrowserMultiFormatReader(hints);
    readerRef.current = reader;

    // Start continuous scanning
    const startScanning = async () => {
      try {
        const constraints: MediaStreamConstraints = {
          video: {
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment'
          }
        };

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        const backCamera = videoDevices.find(device => device.label.toLowerCase().includes('back'));

        if (backCamera) {
          (constraints.video as MediaTrackConstraints).deviceId = backCamera.deviceId;
        }

        await reader.decodeFromConstraints(
          constraints,
          videoRef.current!,
          (result) => {
            if (result) {
              onDetected(result.getText());
            }
          }
        );

        console.log('Scanner started successfully');
      } catch (err) {
        console.error('Failed to start scanner:', err);
      }
    };

    if (videoRef.current) {
      startScanning();
    }

    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, [onDetected, hasScanned]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanArea} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 500,
    height: 200,
    borderWidth: 2,
    borderColor: '#4F7FFF',
    backgroundColor: 'transparent',
    borderRadius: 8,
  },
});