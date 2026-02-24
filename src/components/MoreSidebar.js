import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

export default function MoreSidebar({ visible, onClose }) {
    const navigation = useNavigation();

    const handleNavigate = (screen) => {
        onClose();
        setTimeout(() => {
            navigation.navigate(screen);
        }, 300); // Wait for close animation
    };

    return (
        <Modal visible={visible} transparent={true} animationType="none" onRequestClose={onClose}>
            <View style={styles.overlay}>
                {/* Dismiss Area */}
                <TouchableWithoutFeedback onPress={onClose}>
                    <View style={styles.dismissArea} />
                </TouchableWithoutFeedback>

                {/* Sidebar Panel */}
                <MotiView
                    from={{ translateX: width }}
                    animate={{ translateX: visible ? 0 : width }}
                    transition={{ type: 'spring', damping: 20, stiffness: 120 }}
                    style={styles.sidebar}
                >
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>More Options</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#4b5563" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.menuList}>
                        <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Promotions')}>
                            <View style={[styles.iconBox, { backgroundColor: '#ecfdf5' }]}>
                                <Ionicons name="megaphone" size={20} color="#059669" />
                            </View>
                            <Text style={styles.menuText}>Promotions</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Properties')}>
                            <View style={[styles.iconBox, { backgroundColor: '#fef3c7' }]}>
                                <Ionicons name="home" size={20} color="#d97706" />
                            </View>
                            <Text style={styles.menuText}>Properties</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Events')}>
                            <View style={[styles.iconBox, { backgroundColor: '#fce7f3' }]}>
                                <Ionicons name="calendar" size={20} color="#db2777" />
                            </View>
                            <Text style={styles.menuText}>Events</Text>
                            <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                        </TouchableOpacity>


                    </View>
                </MotiView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        flexDirection: 'row',
    },
    dismissArea: {
        flex: 1,
    },
    sidebar: {
        width: width * 0.75,
        backgroundColor: '#ffffff',
        height: height * 0.9, // 90% of screen height
        marginTop: height * 0.05, // 5% margin from top
        borderTopLeftRadius: 30,
        borderBottomLeftRadius: 30,
        paddingTop: 40,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: -10, height: 0 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 22, fontFamily: 'Outfit_400Regular', 
        color: '#111827',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f3f4f6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuList: {
        flex: 1,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f9fafb',
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 18, fontFamily: 'Outfit_400Regular', 
        color: '#374151',
    }
});
