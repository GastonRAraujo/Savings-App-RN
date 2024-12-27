import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // for the icon, or use any icon library
import { useSQLiteContext } from 'expo-sqlite';
import iolService from '@/services/IolService';
import { initializePortfolio } from '../database';

export default function SettingsScreen() {
  const [isSignInVisible, setIsSignInVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const db = useSQLiteContext();

  // Show the modal
  function openSignInModal() {
    setUsername('');
    setPassword('');
    setIsSignInVisible(true);
  }

  async function handleSignIn() {
    if (!username || !password) {
      alert('Please enter both username and password.');
      return;
    }

    try {
        console.log('username', username);
        console.log('password', password);
        await iolService.authenticate(username, password);
        alert('Signed in successfully!');
        setIsSignInVisible(false);
        initializePortfolio(db);

        // Tokens are now stored in SecureStore, ready for further IOLService calls
    } catch (error) {
        alert('Error signing in: ' + error);
        console.error('Sign In error:', error);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings Screen</Text>

      {/* Example of an icon */}
      <FontAwesome name="cog" size={64} color="#888" style={{ marginBottom: 20 }} />

      {/* Pressable to open the sign-in modal */}
      <Pressable style={styles.button} onPress={openSignInModal}>
        <Text style={styles.buttonText}>Sign In</Text>
      </Pressable>

      {/* Sign In Modal */}
      <Modal
        visible={isSignInVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsSignInVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Sign In</Text>

            <TextInput
              placeholder="Username"
              style={styles.input}
              value={username}
              onChangeText={setUsername}
            />
            <TextInput
              placeholder="Password"
              style={styles.input}
            //   secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Pressable style={styles.modalButton} onPress={handleSignIn}>
                <Text style={styles.modalButtonText}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, { backgroundColor: '#999' }]}
                onPress={() => setIsSignInVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Basic styling
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderRadius: 6,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    marginRight: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
