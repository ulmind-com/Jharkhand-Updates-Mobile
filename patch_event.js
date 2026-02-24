const fs = require('fs');
let c = fs.readFileSync('src/screens/EventDetailsScreen.js', 'utf8');

c = c.replace(
    'const [isImageViewVisible, setIsImageViewVisible] = useState(false);',
    'const [isImageViewVisible, setIsImageViewVisible] = useState(false);\n    const [processingAdmin, setProcessingAdmin] = useState(false);'
);

const adminActionFunc = `
    const handleAdminAction = async (action) => {
        try {
            setProcessingAdmin(true);
            const token = Platform.OS === 'web' ? localStorage.getItem('accessToken') : await SecureStore.getItemAsync('accessToken');
            await axios.post(\`\${BASE_URL}/events/\${eventId}/\${action}\`, {}, {
                headers: { Authorization: \`Bearer \${token}\` }
            });
            Toast.show({ type: 'success', text1: 'Success', text2: \`Event \${action}d successfully\` });
            navigation.goBack();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Error', text2: \`Failed to \${action} event\` });
            setProcessingAdmin(false);
        }
    };
`;

c = c.replace(
    'const fetchComments = async () => {',
    adminActionFunc + '\n    const fetchComments = async () => {'
);


const targetButtonsLocation = `</Text>

                        </View>
                    </MotiView>`;

const buttonsCode = `</Text>

                            {event.status === 'PENDING' && (
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                                    <TouchableOpacity 
                                        style={[{ flex: 1, backgroundColor: '#10b981', padding: 14, borderRadius: 12, alignItems: 'center' }]} 
                                        onPress={() => handleAdminAction('approve')}
                                        disabled={processingAdmin}
                                    >
                                        {processingAdmin ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 15}}>Approve</Text>}
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[{ flex: 1, backgroundColor: '#ef4444', padding: 14, borderRadius: 12, alignItems: 'center' }]} 
                                        onPress={() => handleAdminAction('reject')}
                                        disabled={processingAdmin}
                                    >
                                        {processingAdmin ? <ActivityIndicator color="#fff" /> : <Text style={{color: '#fff', fontFamily: 'Outfit_600SemiBold', fontSize: 15}}>Reject</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </MotiView>`;

// Normalizing line endings for the replace just in case
c = c.split(targetButtonsLocation.split('\\n').join('\\r\\n')).join(buttonsCode);
c = c.split(targetButtonsLocation).join(buttonsCode);

fs.writeFileSync('src/screens/EventDetailsScreen.js', c);
console.log('Done!');
