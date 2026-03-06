import React from 'react';
import { Vibration, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { View as MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { Platform, View, Text, TouchableOpacity } from 'react-native';
import { ThemeContext } from '../context/ThemeContext';

import CommunityScreen from '../screens/CommunityScreen';
import NewsScreen from '../screens/NewsScreen';
import PropertiesScreen from '../screens/PropertiesScreen';
import JobsScreen from '../screens/JobsScreen';
import CreatePostModal from '../components/CreatePostModal';
import MoreScreen from '../screens/MoreScreen';

const Tab = createBottomTabNavigator();
const EmptyScreen = () => null;

export default function TabNavigator() {
    const [isCreateModalVisible, setCreateModalVisible] = React.useState(false);
    const { isDarkMode, colors } = React.useContext(ThemeContext);

    return (
        <React.Fragment>
            <Tab.Navigator
                screenOptions={({ route }) => ({
                    headerShown: false,
                    tabBarActiveTintColor: colors.primary, // emerald-600
                    tabBarInactiveTintColor: colors.textDim, // gray-400
                    tabBarLabelStyle: {
                        fontSize: 10, fontFamily: 'Outfit_600SemiBold',
                        marginBottom: Platform.OS === 'ios' ? 0 : 4,
                    },
                    tabBarStyle: {
                        backgroundColor: colors.surface,
                        position: 'absolute',
                        borderTopWidth: 0,
                        bottom: Platform.OS === 'ios' ? 24 : 16,
                        left: 16,
                        right: 16,
                        elevation: isDarkMode ? 0 : 15,
                        shadowColor: '#000',
                        shadowOpacity: isDarkMode ? 0.3 : 0.08,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 10 },
                        borderRadius: 32,
                        height: 75,
                        paddingTop: 8,
                        paddingBottom: Platform.OS === 'ios' ? 24 : 8,
                    },
                    tabBarIcon: ({ focused, color, size }) => {
                        let iconName;
                        size = 20; // Reduced size for 7 tabs

                        if (route.name === 'Community') iconName = focused ? 'people' : 'people-outline';
                        else if (route.name === 'State News') iconName = focused ? 'newspaper' : 'newspaper-outline';
                        else if (route.name === 'Jobs') iconName = focused ? 'briefcase' : 'briefcase-outline';
                        else if (route.name === 'More') iconName = focused ? 'menu' : 'menu-outline';
                        else if (route.name === 'Post') return null;

                        return (
                            <MotiView
                                animate={{
                                    scale: focused ? 1.1 : 1,
                                    translateY: focused ? -2 : 0,
                                }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                            >
                                <Ionicons name={iconName} size={size} color={color} />
                            </MotiView>
                        );
                    },
                })}
            >
                <Tab.Screen
                    name="Community"
                    options={{ tabBarLabel: 'Citizen News' }}
                    component={CommunityScreen}
                    listeners={{ tabPress: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                />
                <Tab.Screen
                    name="State News"
                    component={NewsScreen}
                    listeners={{ tabPress: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                />

                <Tab.Screen
                    name="Post"
                    component={EmptyScreen}
                    options={{
                        tabBarLabel: () => null,
                        tabBarButton: (props) => (
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => {
                                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setCreateModalVisible(true);
                                }}
                                style={{
                                    top: Platform.OS === 'ios' ? -5 : -20,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flex: 1,
                                }}
                            >
                                <MotiView
                                    from={{ scale: 0.9, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ type: 'spring', delay: 300 }}
                                    style={{
                                        width: 64,
                                        height: 64,
                                        borderRadius: 32,
                                        backgroundColor: '#10b981',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        elevation: 10,
                                        shadowColor: '#10b981',
                                        shadowOpacity: 0.6,
                                        shadowRadius: 10,
                                        shadowOffset: { width: 0, height: 6 },
                                        borderWidth: 4,
                                        borderColor: '#ffffff',
                                    }}
                                >
                                    <Ionicons name="add" size={32} color="#ffffff" />
                                </MotiView>
                            </TouchableOpacity>
                        )
                    }}
                />

                <Tab.Screen
                    name="Jobs"
                    component={JobsScreen}
                    listeners={{ tabPress: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                />

                <Tab.Screen
                    name="More"
                    component={MoreScreen}
                    listeners={{ tabPress: () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } }}
                />
            </Tab.Navigator>

            <CreatePostModal
                visible={isCreateModalVisible}
                onClose={() => setCreateModalVisible(false)}
            />
        </React.Fragment>
    );
}



