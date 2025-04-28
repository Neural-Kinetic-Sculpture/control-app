import { useConfigStore } from '../store';
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, TouchableOpacity } from 'react-native';
import io from 'socket.io-client';

const StartButton = ({ activeConfigs = [] }) => {
    const setEegData = useConfigStore((state) => state.setEegData);
    const setIsPlaying = useConfigStore((state) => state.setIsPlaying);
    const [isPlaying, setIsPlayingLocal] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const socketRef = useRef(null);
    const commandIntervalRef = useRef(null);
    const lastCommandsRef = useRef([]); // avoid duplicates by tracking last control command

    const handlePress = () => {
        if (isPlaying) {
            Alert.alert(
                "Stop Playing?",
                "Are you sure you want to stop playing the configuration?",
                [
                    { text: "No", style: "cancel" },
                    { text: "Yes", onPress: () => {
                        setIsPlayingLocal(false);
                        setIsPlaying(false);
                    }}
                ]
            );
        } else {
            setIsPlayingLocal(true);
            setIsPlaying(true);
        }
    };

    // Function to create a batch command for all active panels
    const prepareControlCommands = () => {
        if (!activeConfigs || activeConfigs.length === 0) return [];
        const commands = [];
        
        activeConfigs.forEach(config => {
            try {
                // Parse selected_panels if it's a string
                let panels = config.selected_panels;
                if (typeof panels === 'string') {
                    panels = JSON.parse(panels);
                }
                // For each selected panel, create a command
                panels.forEach(panel => {
                    const row = panel[0] || 0;
                    const col = panel[2] || 0;
                    const speed = config.speed || 1;
                    const direction = config.direction === 'up' ? 1 : 0;
                    const brightness = config.brightness || 100;
                    const color = config.color || 'FFFFFFFF';
                    
                    // Format: "row col speed direction brightness color"
                    const command = `${row} ${col} ${speed} ${direction} ${brightness} ${color}`;
                    commands.push(command);
                });
            } catch (err) {
                console.error('Error processing selected panels:', err);
            }
        });
        
        return commands;
    };

    // Function to send control commands based on active configs
    const sendControlCommands = () => {
        if (!socketRef.current || !activeConfigs || activeConfigs.length === 0) return;

        const commands = prepareControlCommands();
        
        // Compare with last commands to avoid duplicate sending
        const commandsString = JSON.stringify(commands);
        if (commandsString !== JSON.stringify(lastCommandsRef.current)) {
            //console.log(`Sending ${commands.length} control commands`);
            
            // Send each command once
            commands.forEach(command => {
                //console.log('Sending control command:', command);
                socketRef.current.emit('control_command', command);
            });
            
            // Update last commands reference
            lastCommandsRef.current = commands;
        } else {
            console.log('Commands unchanged, skipping send');
        }
    };

    useEffect(() => {
        if (isPlaying) {
            const socket = io('https://signal-filter.onrender.com', {
                reconnection: true,
                reconnectionAttempts: 5
            });

            socketRef.current = socket;

            socket.on('connect', () => {
                console.log('Connected to WebSocket');
                setConnectionStatus('Connected');
                
                // Send initial control commands once connected
                if (activeConfigs.length > 0) {
                    setTimeout(() => sendControlCommands(), 1000); // Send initial commands after a short delay
                }
            });

            socket.on('connect_error', (error) => {
                console.error('Connection error:', error);
                setConnectionStatus('Error');
            });

            socket.on('error', (error) => {
                console.error('Socket error:', error);
                setConnectionStatus('Error');
            });

            socket.on('control_command', (command) => {
                //console.log('Received control command from server:', command);
            });
            
            socket.on('eeg_data', (data) => {
                try {
                    const parsed = typeof data === 'string' ? JSON.parse(data) : data;

                    const {
                        alpha_band = 0,
                        beta_band = 0,
                        theta_band = 0,
                        delta_band = 0,
                        gamma_band = 0,
                        dominant_band = "none",
                        alpha_beta_ratio = 0,
                        alpha_delta_ratio = 0,
                        peak_alpha_freq = 0,
                        psd = 0,
                        timestamp = Date.now() / 1000
                    } = parsed;
                    
                    console.log(
                        `Alpha: ${alpha_band.toFixed(2)} | Beta: ${beta_band.toFixed(2)} | Theta: ${theta_band.toFixed(2)}\n` +
                        `Delta: ${delta_band.toFixed(2)} | Gamma: ${gamma_band.toFixed(2)} | Dominant: ${dominant_band}\n` +
                        `Alpha/Beta Ratio: ${alpha_beta_ratio.toFixed(2)} | Alpha/Delta Ratio: ${alpha_delta_ratio.toFixed(2)}\n` +
                        `Peak Alpha Freq: ${peak_alpha_freq.toFixed(2)} Hz | PSD: ${psd.toFixed(2)} μV^2/Hz | Time: ${timestamp}`
                    );                    

                    setEegData(parsed);
                } catch (err) {
                    console.error("Error parsing EEG data:", err);
                }
            });

            // set up interval to send control commands every 3 seconds
            commandIntervalRef.current = setInterval(sendControlCommands, 3000);

            return () => {
                if (commandIntervalRef.current) {
                    clearInterval(commandIntervalRef.current);
                    commandIntervalRef.current = null;
                }
                
                socket.disconnect();
                console.log("🔌Disconnected from WebSocket server");
                setConnectionStatus('Disconnected');
            };
        } else {
            // Clean up when stopped playing
            if (commandIntervalRef.current) {
                clearInterval(commandIntervalRef.current);
                commandIntervalRef.current = null;
            }
            
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current = null;
                setConnectionStatus('Disconnected');
            }
        }
    }, [isPlaying]);

    // specifically watch for activeConfigs changes to update our commands
    useEffect(() => {
        if (isPlaying && socketRef.current) {
            // Reset the lastCommandsRef to force a refresh of commands
            lastCommandsRef.current = [];
            sendControlCommands();
        }
    }, [activeConfigs]);

    const getStatusColor = () => {
        switch (connectionStatus) {
            case 'Connected': return 'text-green-500';
            case 'Disconnected': return 'text-red-400';
            case 'Error': return 'text-yellow-500';
            default: return 'text-gray-500';
        }
    };

    return (
        <View className="pt-5 pb-5 items-center">
            <TouchableOpacity
                className={`rounded-2xl py-4 px-36 ${isPlaying ? 'bg-darkPurple' : 'bg-lightPurple'}`}
                onPress={handlePress}
            >
                <Text className="text-white font-bold">{isPlaying ? 'Playing...' : 'Press to begin'}</Text>
            </TouchableOpacity>

            <Text className={`mt-2 text-sm font-semibold ${getStatusColor()}`}>
                {connectionStatus} {activeConfigs.length > 0 ? `(${activeConfigs.length} active)` : ''}
            </Text>
        </View>
    );
};

export default StartButton;