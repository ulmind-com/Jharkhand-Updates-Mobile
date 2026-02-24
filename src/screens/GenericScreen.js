import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function GenericScreen({ title }) {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Coming soon...</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f3f4f6', // gray-100
    },
    title: {
        fontSize: 24, fontFamily: 'Outfit_400Regular', 
        color: '#047857', // emerald-700
    },
    subtitle: {
        fontSize: 16, fontFamily: 'Outfit_400Regular', 
        color: '#6b7280', // gray-500
        marginTop: 8,
    }
});



