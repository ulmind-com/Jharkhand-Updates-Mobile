import React, { useContext } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import ContentLoader, { Rect, Circle } from 'react-content-loader/native';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const PostSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.card}>
            <ContentLoader speed={1} width={width - 32} height={250} viewBox={`0 0 ${width - 32} 250`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Circle cx="20" cy="20" r="20" />
                <Rect x="50" y="8" rx="4" ry="4" width="120" height="10" />
                <Rect x="50" y="26" rx="4" ry="4" width="80" height="8" />
                <Rect x="0" y="60" rx="4" ry="4" width="100%" height="8" />
                <Rect x="0" y="80" rx="4" ry="4" width="90%" height="8" />
                <Rect x="0" y="100" rx="4" ry="4" width="70%" height="8" />
                <Rect x="0" y="130" rx="10" ry="10" width="100%" height="100" />
            </ContentLoader>
        </View>
    );
};

export const NewsSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.newsCard}>
            <ContentLoader speed={1} width={width - 32} height={300} viewBox={`0 0 ${width - 32} 300`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="0" rx="15" ry="15" width="100%" height="300" />
            </ContentLoader>
        </View>
    );
};

export const EventSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.eventCard}>
            <ContentLoader speed={1} width={width - 32} height={280} viewBox={`0 0 ${width - 32} 280`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="0" rx="15" ry="15" width="100%" height="160" />
                <Rect x="15" y="180" rx="4" ry="4" width="70%" height="20" />
                <Rect x="15" y="215" rx="4" ry="4" width="40%" height="15" />
                <Rect x="15" y="245" rx="4" ry="4" width="50%" height="15" />
            </ContentLoader>
        </View>
    );
};

export const JobSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.jobCard}>
            <ContentLoader speed={1} width={width - 32} height={180} viewBox={`0 0 ${width - 32} 180`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="10" rx="4" ry="4" width="70%" height="20" />
                <Rect x="0" y="45" rx="4" ry="4" width="40%" height="15" />
                <Circle cx="10" cy="85" r="10" />
                <Rect x="30" y="80" rx="4" ry="4" width="60%" height="10" />
                <Circle cx="10" cy="115" r="10" />
                <Rect x="30" y="110" rx="4" ry="4" width="50%" height="10" />
                <Rect x="0" y="145" rx="10" ry="10" width="80" height="30" />
            </ContentLoader>
        </View>
    );
};

export const PropertySkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.propertyCard}>
            <ContentLoader speed={1} width={width - 32} height={280} viewBox={`0 0 ${width - 32} 280`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="0" rx="12" ry="12" width="100%" height="200" />
                <Rect x="0" y="215" rx="4" ry="4" width="80%" height="20" />
                <Rect x="0" y="245" rx="4" ry="4" width="50%" height="16" />
            </ContentLoader>
        </View>
    );
};

export const PromotionSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.promotionCard}>
            <ContentLoader speed={1} width={width - 32} height={90} viewBox={`0 0 ${width - 32} 90`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="0" rx="12" ry="12" width="90" height="90" />
                <Rect x="105" y="10" rx="4" ry="4" width="60%" height="16" />
                <Rect x="105" y="35" rx="4" ry="4" width="40%" height="12" />
                <Rect x="105" y="65" rx="4" ry="4" width="80%" height="12" />
            </ContentLoader>
        </View>
    );
};

export const DetailSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.detailCard}>
            <ContentLoader speed={1} width={width} height={600} viewBox={`0 0 ${width} 600`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                <Rect x="0" y="0" width="100%" height="250" />
                <Rect x="20" y="280" rx="4" ry="4" width="80%" height="28" />
                <Rect x="20" y="320" rx="4" ry="4" width="40%" height="16" />
                <Rect x="20" y="350" rx="4" ry="4" width="60" height="24" />
                <Rect x="90" y="350" rx="4" ry="4" width="80" height="24" />
                <Rect x="20" y="400" rx="4" ry="4" width="90%" height="14" />
                <Rect x="20" y="425" rx="4" ry="4" width="95%" height="14" />
                <Rect x="20" y="450" rx="4" ry="4" width="85%" height="14" />
                <Rect x="20" y="475" rx="4" ry="4" width="80%" height="14" />
                <Rect x="20" y="500" rx="4" ry="4" width="90%" height="14" />
            </ContentLoader>
        </View>
    );
};

export const ProfileSkeleton = () => {
    const { isDarkMode, colors } = useContext(ThemeContext);
    const styles = getStyles(colors, isDarkMode);
    return (
        <View style={styles.profileContainer}>
            <View style={styles.profileCard}>
                <ContentLoader speed={1} width={width - 32} height={120} viewBox={`0 0 ${width - 32} 120`} backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Circle cx="50" cy="50" r="40" />
                    <Rect x="110" y="25" rx="4" ry="4" width="150" height="20" />
                    <Rect x="110" y="55" rx="4" ry="4" width="200" height="12" />
                    <Rect x="110" y="80" rx="12" ry="12" width="60" height="24" />
                </ContentLoader>
            </View>
            <View style={{ marginBottom: 12, marginLeft: 4 }}>
                <ContentLoader speed={1} width={120} height={20} viewBox="0 0 120 20" backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                    <Rect x="0" y="0" rx="4" ry="4" width="120" height="20" />
                </ContentLoader>
            </View>
            <View style={styles.statsGrid}>
                {[1, 2, 3, 4].map((key) => (
                    <View key={key} style={styles.statBox}>
                        <ContentLoader speed={1} width="100%" height={60} viewBox="0 0 100 60" backgroundColor={isDarkMode ? colors.surfaceDeeper : "#f3f4f6"} foregroundColor={isDarkMode ? colors.border : "#e5e7eb"}>
                            <Rect x="30" y="10" rx="4" ry="4" width="40" height="20" />
                            <Rect x="20" y="40" rx="4" ry="4" width="60" height="12" />
                        </ContentLoader>
                    </View>
                ))}
            </View>
        </View>
    );
};

const getStyles = (colors, isDarkMode) => StyleSheet.create({
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 16, marginBottom: 16, elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 4, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    newsCard: { backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 6, height: 300, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    jobCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3, borderWidth: 1, borderColor: colors.border },
    eventCard: { backgroundColor: colors.surface, borderRadius: 20, marginBottom: 20, overflow: 'hidden', elevation: 4, paddingBottom: 20, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    detailCard: { backgroundColor: colors.surface, flex: 1, width: '100%' },
    promotionCard: { backgroundColor: colors.surface, borderRadius: 20, padding: 12, marginBottom: 16, elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.1, shadowRadius: 4, flexDirection: 'row', width: '100%', borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    profileContainer: { flex: 1, padding: 16 },
    profileCard: { backgroundColor: colors.surface, borderRadius: 24, padding: 20, marginBottom: 24, elevation: 4, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 8, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
    statBox: { flex: 1, minWidth: '45%', backgroundColor: colors.surface, padding: 16, borderRadius: 20, alignItems: 'center', elevation: 2, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: isDarkMode ? 0.3 : 0.05, shadowRadius: 4, borderWidth: isDarkMode ? 1 : 0, borderColor: colors.border }
});
