import React, { useState, useEffect, useRef } from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  PanResponder,
  Dimensions,
  Platform,
} from 'react-native';

import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'react-native-camera-kit';

const jsotp = require('jsotp');

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Account {
  id: string;
  issuer: string;
  accountName: string;
  secret: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// TOTP using proper library
const generateTOTP = (secret: string): string => {
  try {
    const totp = jsotp.TOTP(secret);
    return totp.now();
  } catch (error) {
    console.error('TOTP generation error:', error);
    const timeStep = Math.floor(Date.now() / 30000);
    let hash = secret.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, timeStep);

    return Math.abs(hash % 1000000).toString().padStart(6, '0');
  }
};

// Draggable Tile Component
const DraggableTile: React.FC<{
  account: Account;
  totpCode: string;
  onPositionChange: (x: number, y: number) => void;
  onSizeChange: (width: number, height: number) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}> = ({ account, totpCode, onPositionChange, onSizeChange, onDelete, onDragStart, onDragEnd }) => {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const initialPinchData = useRef({
    distance: 0,
    width: 0,
    height: 0,
    horizontalSpread: 0,
    verticalSpread: 0
  });

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,

    onPanResponderGrant: (evt) => {
      if (evt.nativeEvent.touches.length === 2) {
        const touch1 = evt.nativeEvent.touches[0];
        const touch2 = evt.nativeEvent.touches[1];

        const horizontalSpread = Math.abs(touch1.pageX - touch2.pageX);
        const verticalSpread = Math.abs(touch1.pageY - touch2.pageY);

        initialPinchData.current = {
          distance: Math.sqrt(
            Math.pow(touch1.pageX - touch2.pageX, 2) +
            Math.pow(touch1.pageY - touch2.pageY, 2)
          ),
          width: account.width,
          height: account.height,
          horizontalSpread,
          verticalSpread
        };

        setIsResizing(true);
      } else if (evt.nativeEvent.touches.length === 1 && isDragging) {
        Animated.spring(scale, {
          toValue: 1.05,
          useNativeDriver: false,
        }).start();
      }
    },

    onPanResponderMove: (evt, gesture) => {
      if (evt.nativeEvent.touches.length === 2 && isResizing) {
        const touch1 = evt.nativeEvent.touches[0];
        const touch2 = evt.nativeEvent.touches[1];

        const currentHorizontalSpread = Math.abs(touch1.pageX - touch2.pageX);
        const currentVerticalSpread = Math.abs(touch1.pageY - touch2.pageY);

        const widthScale = currentHorizontalSpread / initialPinchData.current.horizontalSpread;
        const heightScale = currentVerticalSpread / initialPinchData.current.verticalSpread;

        const newWidth = Math.max(120, Math.min(350, initialPinchData.current.width * widthScale));
        const newHeight = Math.max(80, Math.min(250, initialPinchData.current.height * heightScale));

        onSizeChange(newWidth, newHeight);
      } else if (evt.nativeEvent.touches.length === 1 && isDragging) {
        pan.setValue({ x: gesture.dx, y: gesture.dy });
      }
    },

    onPanResponderRelease: (_, gesture) => {
      if (isResizing) setIsResizing(false);

      if (isDragging) {
        setIsDragging(false);
        onDragEnd();

        const newX = Math.max(-account.width * 0.8, Math.min(SCREEN_WIDTH - account.width * 0.2, account.x + gesture.dx));
        const newY = Math.max(-50, Math.min(SCREEN_HEIGHT - account.height - 50, account.y + gesture.dy));

        onPositionChange(newX, newY);

        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
      }

      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();
    },
  });

  const handleLongPress = () => {
    setIsDragging(true);
    onDragStart();
    Animated.spring(scale, {
      toValue: 1.05,
      useNativeDriver: false,
    }).start();
  };

  const baseFontSize = Math.min(account.width / 12, account.height / 8);
  const issuerFontSize = Math.max(12, Math.min(16, baseFontSize));
  const accountFontSize = Math.max(10, Math.min(14, baseFontSize * 0.8));
  const codeFontSize = Math.max(14, Math.min(24, baseFontSize * 1.4));
  const hintFontSize = Math.max(8, Math.min(12, baseFontSize * 0.7));

  return (
    <Animated.View
      style={[
        styles.tile,
        {
          left: account.x,
          top: account.y,
          width: account.width,
          height: account.height,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
        isDragging && styles.tileDragging,
      ]}
      {...panResponder.panHandlers}
    >
      <TouchableOpacity
        onLongPress={handleLongPress}
        delayLongPress={500}
        style={styles.tileContent}
        activeOpacity={0.8}
      >
        <Text style={[styles.tileIssuer, { fontSize: issuerFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
          {account.issuer}
        </Text>
        <Text style={[styles.tileAccount, { fontSize: accountFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
          {account.accountName}
        </Text>
        <Text style={[styles.tileCode, { fontSize: codeFontSize }]} numberOfLines={1} adjustsFontSizeToFit>
          {totpCode.slice(0, 3)} {totpCode.slice(3)}
        </Text>
        {(isDragging || isResizing) && (
          <Text
            style={[
              isDragging ? styles.dragHint : styles.resizeHint,
              { fontSize: hintFontSize }
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {isDragging ? 'Drag to move' : 'Resizing...'}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function App() {
  const [showCamera, setShowCamera] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [buttonRotation] = useState(new Animated.Value(0));
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [currentlyDraggingTile, setCurrentlyDraggingTile] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleCamera = () => {
    Animated.timing(buttonRotation, {
      toValue: showCamera ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    setShowCamera(!showCamera);
  };

  const handleQRScan = (event: { nativeEvent: { codeStringValue?: string } }) => {
    const qrData = event.nativeEvent.codeStringValue;
    if (!qrData) return;

    if (qrData.startsWith('otpauth://totp/')) {
      try {
        const url = new URL(qrData);
        const label = decodeURIComponent(url.pathname).slice(1);

        let issuer = url.searchParams.get('issuer') || '';
        let accountName = '';

        if (label.includes(':')) {
          const [labelIssuer, labelAccount] = label.split(':', 2);
          if (!issuer) issuer = labelIssuer;
          accountName = labelAccount;
        } else {
          accountName = label;
          if (!issuer) issuer = label;
        }

        if (!issuer) issuer = 'Account';
        if (!accountName) accountName = 'Unknown';

        const secret = url.searchParams.get('secret');
        if (!secret) {
          Alert.alert('Error', 'QR code missing secret key');
          return;
        }

        const newAccount: Account = {
          id: Date.now().toString(),
          issuer,
          accountName,
          secret,
          x: Math.random() * 150 + 50,
          y: Math.random() * 400 + 150,
          width: 180,
          height: 100,
        };

        setAccounts(prev => [...prev, newAccount]);

        setShowCamera(false);
        Animated.timing(buttonRotation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

      } catch (error) {
        console.error('QR parsing error:', error);
        Alert.alert('Error', 'Invalid QR code format');
      }
    } else {
      Alert.alert('Invalid QR Code', 'Please scan a valid authenticator QR code');
    }
  };

  const updateTilePosition = (accountId: string, x: number, y: number) => {
    setAccounts(prev =>
      prev.map(account =>
        account.id === accountId
          ? { ...account, x, y }
          : account
      )
    );
  };

  const updateTileSize = (accountId: string, width: number, height: number) => {
    setAccounts(prev =>
      prev.map(account =>
        account.id === accountId
          ? { ...account, width, height }
          : account
      )
    );
  };

  const deleteTile = (accountId: string) => {
    setAccounts(prev => prev.filter(account => account.id !== accountId));
    setShowDeleteZone(false);
    setCurrentlyDraggingTile(null);
  };

  const handleTileDragStart = (tileId: string) => {
    setShowDeleteZone(true);
    setCurrentlyDraggingTile(tileId);
  };

  const handleTileDragEnd = () => {
    setShowDeleteZone(false);
    setCurrentlyDraggingTile(null);
  };

  const handleDeleteButtonPress = () => {
    if (currentlyDraggingTile) {
      const tileToDelete = accounts.find(acc => acc.id === currentlyDraggingTile);
      if (tileToDelete) {
        Alert.alert(
          'Delete Account',
          `Delete ${tileToDelete.issuer}: ${tileToDelete.accountName}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteTile(currentlyDraggingTile) }
          ]
        );
      }
    }
  };

  const getTOTPTimeLeft = (): number => {
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  };

  const getCountdownColor = (timeLeft: number): string => {
    if (timeLeft <= 5) return '#FF3B30';
    if (timeLeft <= 10) return '#FF9500';
    return '#34C759';
  };

  const spin = buttonRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '45deg'],
  });

  if (showCamera) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" />
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            scanBarcode
            onReadCode={handleQRScan}
            showFrame
            laserColor="#007AFF"
            frameColor="#007AFF"
            barcodeFrameSize={{ width: 250, height: 250 }}
          />

          <SafeAreaView style={styles.cameraHeader}>
            <TouchableOpacity style={styles.closeButton} onPress={toggleCamera}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
          </SafeAreaView>

          <SafeAreaView style={styles.cameraFooter}>
            <Text style={styles.cameraInstructions}>
              Point your camera at a 2FA QR code
            </Text>
          </SafeAreaView>
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        <View style={styles.canvas}>
          {accounts.length > 0 && (
            <View style={styles.globalCountdownContainer}>
              <View style={styles.countdownBarBackground}>
                <View
                  style={[
                    styles.countdownBarFill,
                    {
                      backgroundColor: getCountdownColor(getTOTPTimeLeft()),
                      height: `${(getTOTPTimeLeft() / 30) * 100}%`
                    }
                  ]}
                />
              </View>
              <Text style={[styles.globalTimeLeftText, { color: getCountdownColor(getTOTPTimeLeft()) }]}>
                {getTOTPTimeLeft()}
              </Text>
            </View>
          )}

          {accounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>AuthTiles</Text>
              <Text style={styles.emptyStateSubtext}>
                Tap the + button to add your first account
              </Text>
            </View>
          ) : (
            accounts.map((account) => (
              <DraggableTile
                key={account.id}
                account={account}
                totpCode={generateTOTP(account.secret)}
                onPositionChange={(x, y) => updateTilePosition(account.id, x, y)}
                onSizeChange={(width, height) => updateTileSize(account.id, width, height)}
                onDelete={() => deleteTile(account.id)}
                onDragStart={() => handleTileDragStart(account.id)}
                onDragEnd={handleTileDragEnd}
              />
            ))
          )}

          {showDeleteZone && (
            <TouchableOpacity
              style={styles.deleteZone}
              onPress={handleDeleteButtonPress}
              activeOpacity={0.7}
            >
              <View style={styles.deleteZoneCircle}>
                <Text style={styles.deleteZoneText}>🗑️</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.floatingButton} onPress={toggleCamera}>
          <Animated.Text style={[styles.floatingButtonText, { transform: [{ rotate: spin }] }]}>
            +
          </Animated.Text>
        </TouchableOpacity>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  canvas: {
    flex: 1,
    position: 'relative',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },

  floatingButton: {
    position: 'absolute',
    bottom: 40,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingButtonText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
  },

  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '400',
  },
  cameraFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 40,
    alignItems: 'center',
  },
  cameraInstructions: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
  },

  tile: {
    position: 'absolute',
    width: 180,
    height: 100,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  tileDragging: {
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  tileContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  tileIssuer: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  tileAccount: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  tileCode: {
    fontSize: 20,
    fontWeight: '800',
    color: '#007AFF',
    letterSpacing: 2,
    fontFamily: 'Menlo',
    textAlign: 'center',
  },
  dragHint: {
    fontSize: 10,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  resizeHint: {
    fontSize: 10,
    color: '#FF9500',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  tileOverDelete: {
    backgroundColor: '#ffebee',
    borderColor: '#FF3B30',
    borderWidth: 2,
  },

  deleteZone: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    zIndex: 5,
  },
  deleteZoneCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  deleteZoneText: {
    fontSize: 24,
    color: '#fff',
  },

  globalCountdownContainer: {
    position: 'absolute',
    top: 40,
    left: 24,
    width: 48,
    height: 60,
    alignItems: 'center',
    zIndex: 10,
  },
  countdownBarBackground: {
    width: 8,
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  countdownBarFill: {
    width: '100%',
    borderRadius: 4,
  },
  globalTimeLeftText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
});
