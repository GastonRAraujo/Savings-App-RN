import React, { useState } from 'react';
import { View, Text, Pressable, Modal, TextInput, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons'; // or any other icon library
import { useSQLiteContext } from 'expo-sqlite';
import iolService from '@/services/IolService';
import { initializePortfolio } from '@/app/database'; // adjust path as needed

export default function SavingsSettingsModal() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const db = useSQLiteContext();

  function openModal() {
    setUsername('');
    setPassword('');
    setIsModalVisible(true);
  }

  async function handleSignIn() {
    if (!username || !password) {
      alert('Please enter both username and password.');
      return;
    }
    try {
      console.log('username:', username);
      console.log('password:', password);
      await iolService.authenticate(username, password);
      alert('Signed in successfully!');
      setIsModalVisible(false);
      // Initialize the portfolio in the database after authentication
      await initializePortfolio(db);
    } catch (error) {
      console.error('Sign In error:', error);
      alert('Error signing in: ' + error);
    }
  }

  return (
    <View style={styles.container}>
      {/* Button to open the modal */}
      <Pressable style={styles.button} onPress={openModal}>
        <Text style={styles.buttonText}>Sign In to IOL</Text>
      </Pressable>

      {/* Modal with sign-in form */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
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
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <View style={styles.buttonRow}>
              <Pressable style={styles.modalButton} onPress={handleSignIn}>
                <Text style={styles.modalButtonText}>Sign In</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
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

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  button: {
    backgroundColor: '#007bff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 10,
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
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    borderRadius: 6,
  },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: {
    flex: 1,
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginRight: 10,
  },
  cancelButton: { backgroundColor: '#999' },
  modalButtonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});
