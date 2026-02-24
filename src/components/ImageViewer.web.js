import React from 'react';
import { View, Modal, TouchableOpacity, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function ImageViewing({ images, imageIndex, visible, onRequestClose }) {
    if (!visible || !images || images.length === 0) return null;

    return (
        <Modal visible={visible} transparent={true} onRequestClose={onRequestClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.closeButton} onPress={onRequestClose}>
                    <Ionicons name="close" size={32} color="#fff" />
                </TouchableOpacity>
                <Image
                    source={{ uri: images[imageIndex]?.uri }}
                    style={styles.image}
                    resizeMode="contain"
                />
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 10,
        padding: 8,
    },
    image: {
        width: width,
        height: height * 0.8,
    }
});
