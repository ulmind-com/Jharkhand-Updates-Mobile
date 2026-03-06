import React from 'react';
import { Text, Linking, StyleSheet } from 'react-native';

const LinkedText = ({ children, style, linkStyle, numberOfLines, ...props }) => {
    if (!children || typeof children !== 'string') {
        return <Text style={style} numberOfLines={numberOfLines} {...props}>{children}</Text>;
    }

    // Regex to match URLs starting with http://, https://, or www.
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = children.split(urlRegex);

    return (
        <Text style={style} numberOfLines={numberOfLines} {...props}>
            {parts.map((part, index) => {
                if (part.match(urlRegex)) {
                    let url = part;
                    if (url.startsWith('www.')) {
                        url = 'https://' + url;
                    }
                    return (
                        <Text
                            key={index}
                            style={[style, styles.link, linkStyle]}
                            onPress={() => Linking.openURL(url)}
                            suppressHighlighting={true}
                        >
                            {part}
                        </Text>
                    );
                }
                return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
        </Text>
    );
};

const styles = StyleSheet.create({
    link: {
        color: '#3b82f6', // Bright blue for links
        textDecorationLine: 'underline',
    },
});

export default LinkedText;
