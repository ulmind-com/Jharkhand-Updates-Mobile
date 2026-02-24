import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import TopHeader from '../components/TopHeader';
import { ThemeContext } from '../context/ThemeContext';

export default function MoreScreen() {
    const navigation = useNavigation();
    const { isDarkMode, colors } = React.useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);

    const handleNavigate = (screen) => {
        navigation.navigate(screen);
    };

    return (
        <SafeAreaView style={styles.safeArea} edges={['top']}>
            <TopHeader />
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.pageTitle}>More Options</Text>

                <View style={styles.menuContainer}>
                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Promotions')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#ecfdf5' }]}>
                            <Ionicons name="megaphone" size={24} color={isDarkMode ? '#34d399' : '#059669'} />
                        </View>
                        <Text style={styles.menuText}>Promotions</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Properties')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fef3c7' }]}>
                            <Ionicons name="home" size={24} color={isDarkMode ? '#fbbf24' : '#d97706'} />
                        </View>
                        <Text style={styles.menuText}>Properties</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.menuItem} onPress={() => handleNavigate('Events')}>
                        <View style={[styles.iconBox, { backgroundColor: isDarkMode ? colors.surfaceDeeper : '#fce7f3' }]}>
                            <Ionicons name="calendar" size={24} color={isDarkMode ? '#f472b6' : '#db2777'} />
                        </View>
                        <Text style={styles.menuText}>Events</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
                    </TouchableOpacity>

                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.surface,
    },
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: 20,
        paddingBottom: 100, // accommodate floating tab bar
    },
    pageTitle: {
        fontSize: 28, fontFamily: 'Outfit_700Bold',
        color: colors.text,
        marginBottom: 24,
        marginTop: 10,
    },
    menuContainer: {
        backgroundColor: colors.surface,
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        elevation: 3,
        shadowColor: colors.shadow,
        shadowOpacity: isDarkMode ? 0.3 : 0.05,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        borderWidth: isDarkMode ? 1 : 0,
        borderColor: colors.border
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    menuText: {
        flex: 1,
        fontSize: 18, fontFamily: 'Outfit_500Medium',
        color: colors.text,
    }
});



