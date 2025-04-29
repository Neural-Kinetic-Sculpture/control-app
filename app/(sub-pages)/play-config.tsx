import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Header from '@/components/Header';
import { icons } from '@/constants';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import ConfigPlay from '@/components/ConfigPlay';
import ConfigDetails from '@/components/ConfigDetails';
import StartButton from '@/components/StartButton';
import { useConfigStore } from '../../store';
import { Audio } from 'expo-av';

// Define preset audio files

// Define preset audio files with extended list
const PRESET_AUDIO = [
  { id: '1', name: 'Bright Star', path: require('@/assets/sounds/synth-bright-star.wav') },
  { id: '2', name: 'Cream', path: require('@/assets/sounds/synth-cream.wav') },
  { id: '3', name: 'Tah-Dah', path: require('@/assets/sounds/synth-cut-tahdah.wav') },
  { id: '4', name: 'Electroids', path: require('@/assets/sounds/synth-electroids.wav') },
  { id: '5', name: 'Foggy', path: require('@/assets/sounds/synth-foggy.wav') },
  { id: '6', name: 'Gentle', path: require('@/assets/sounds/synth-gentle.wav') },
  { id: '7', name: 'Low Stringy', path: require('@/assets/sounds/synth-low-stringy.wav') },
  { id: '8', name: 'Soft Mystery', path: require('@/assets/sounds/synth-soft-mystery.wav') },
  { id: '9', name: 'Sunset', path: require('@/assets/sounds/synth-sunset.wav') },
];

const PlayConfig = () => {
  const { configId } = useLocalSearchParams();
  const eegData = useConfigStore((state) => state.eegData);
  const isPlaying = useConfigStore((state) => state.isPlaying);
  const alpha_band = eegData?.alpha_band ?? -1;
  const beta_band = eegData?.beta_band ?? -1;
  const theta_band = eegData?.theta_band ?? -1;
  const delta_band = eegData?.delta_band ?? -1;
  const gamma_band = eegData?.gamma_band ?? -1;
  const dominant_band = eegData?.dominant_band ?? -1;
  const alpha_beta_ratio = eegData?.alpha_beta_ratio ?? -1;
  const alpha_delta_ratio = eegData?.alpha_delta_ratio ?? -1;
  const peak_alpha_freq = eegData?.peak_alpha_freq ?? -1;
  const psd = eegData?.psd ?? -1;
  const timestamp = eegData?.timestamp ?? '';

  const [fetchError, setFetchError] = useState('');
  const [data, setData] = useState(null);
  const [configData, setConfigData] = useState(null);
  const [logs, setLogs] = useState([]);
  const [previousActiveConfigs, setPreviousActiveConfigs] = useState([]);
  const [audioSettings, setAudioSettings] = useState(null);
  const [soundObjects, setSoundObjects] = useState({});
  const [playingStatus, setPlayingStatus] = useState({});

  // Track the last played time for each sound to ensure 1.5s between plays
  const lastPlayedTime = useRef({});
  // Track active sound instances to allow overlapping
  const activeSoundInstances = useRef({});

  // Load sounds once when component mounts
  useEffect(() => {
    const loadSounds = async () => {
      try {
        // Initialize audio
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });

        // Load multiple instances of each sound to allow overlapping
        const sounds = {};
        for (const audio of PRESET_AUDIO) {
          sounds[audio.id] = [];
          // Create 3 instances of each sound for overlapping
          for (let i = 0; i < 3; i++) {
            const { sound } = await Audio.Sound.createAsync(
              audio.path,
              { isLooping: false }
            );
            sounds[audio.id].push(sound);
          }
        }

        setSoundObjects(sounds);
        console.log("All sounds loaded successfully");
      } catch (error) {
        console.error("Error loading sounds:", error);
      }
    };

    loadSounds();

    // Clean up on unmount
    return () => {
      Object.values(soundObjects).forEach(soundArray => {
        if (Array.isArray(soundArray)) {
          soundArray.forEach(sound => {
            if (sound) sound.unloadAsync();
          });
        }
      });
    };
  }, []);

  // Function to play a sound with overlap capability
  const playSound = async (soundId) => {
    // Skip if sound isn't loaded yet
    if (!soundObjects[soundId] || !Array.isArray(soundObjects[soundId])) {
      console.log("Sound not loaded yet:", soundId);
      return;
    }

    const now = Date.now();
    // Check if it's been at least 1.5 seconds since this sound was last played
    if (lastPlayedTime.current[soundId] && now - lastPlayedTime.current[soundId] < 1500) {
      return;
    }

    try {
      // Find an available sound instance (not currently playing)
      let availableIndex = -1;
      for (let i = 0; i < soundObjects[soundId].length; i++) {
        if (!activeSoundInstances.current[`${soundId}_${i}`]) {
          availableIndex = i;
          break;
        }
      }

      // If all instances are playing, use the first one
      if (availableIndex === -1) {
        availableIndex = 0;
      }

      const soundInstance = soundObjects[soundId][availableIndex];
      const instanceKey = `${soundId}_${availableIndex}`;

      // Reset sound to beginning
      await soundInstance.setPositionAsync(0);
      await soundInstance.setVolumeAsync(1.0);

      // Track that this instance is now active
      activeSoundInstances.current[instanceKey] = true;

      // Set up listener to know when sound finishes
      soundInstance.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          // Mark as available again when done
          activeSoundInstances.current[instanceKey] = false;
        }
      });

      // Play the sound
      await soundInstance.playAsync();

      // Update last played time
      lastPlayedTime.current[soundId] = now;

      console.log(`Playing sound ${soundId} (instance ${availableIndex})`);
    } catch (error) {
      console.error(`Error playing sound ${soundId}:`, error);
    }
  };

  // Monitor PSD values to play appropriate sounds
  useEffect(() => {
    if (!isPlaying || psd === -1 || !Object.keys(soundObjects).length) return;

    console.log("Processing PSD value for audio:", psd);

    // Map PSD ranges to different sounds
    /*if (psd > 150) {
      playSound('1'); // Bright Star for very high PSD
    }
    else if (psd > 120 && psd <= 150) {
      playSound('2'); // Cream for high PSD
    }
    else if (psd > 100 && psd <= 120) {
      playSound('3'); // Tah-Dah for medium-high PSD
    }
    else if (psd > 80 && psd <= 100) {
      playSound('4'); // Electroids for medium PSD
    }
    else if (psd > 60 && psd <= 80) {
      playSound('5'); // Foggy for medium-low PSD
    }
    else if (psd > 40 && psd <= 60) {
      playSound('6'); // Gentle for low PSD
    }
    else if (psd > 20 && psd <= 40) {
      playSound('7'); // Low Stringy for very low PSD
    }
    else if (psd <= 20 && psd > 0) {
      playSound('8'); // Soft Mystery for extremely low PSD
    }

    // Also play sounds based on other EEG metrics if desired
    if (alpha_band > 70) {
      playSound('9'); // Sunset for high alpha
    }
        */
    // Extract the last digit of the PSD value
      const psdString = psd.toString();
      const lastDigit = parseInt(psdString[psdString.length - 1]);

      // Only play a sound if the last digit is 1-9 (not 0)
      if (lastDigit >= 1 && lastDigit <= 9) {
        // Map the last digit directly to the sound ID
        playSound(lastDigit.toString());
        console.log(`Playing sound ${lastDigit} based on last digit of PSD: ${psd}`);
      } else {
        console.log(`No sound for PSD ${psd} (last digit is 0)`);
      }

  }, [psd, alpha_band, isPlaying, soundObjects]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';

    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return timestamp;
      }

      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.log('Error formatting timestamp:', error);
      return timestamp;
    }
  };

  useEffect(() => {
    if (dominant_band && timestamp) {
      const formattedTime = formatTimestamp(timestamp);
      const logEntry = `Dominant band: ${dominant_band}, alpha: ${alpha_band.toFixed(2)}, beta: ${beta_band.toFixed(2)}, theta: ${theta_band.toFixed(2)}, delta: ${delta_band.toFixed(2)}, gamma: ${gamma_band.toFixed(2)}, peak alpha freq: ${peak_alpha_freq.toFixed(2)}, psd: ${psd.toFixed(2)}, Time: ${formattedTime}`;
      setLogs((prevLogs) => {
        const updatedLogs = [logEntry, ...prevLogs];
        return updatedLogs.slice(0, 10);
      });
    }
  }, [dominant_band, alpha_band, beta_band, theta_band, delta_band, gamma_band, psd, timestamp]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const userId = userData?.user?.id;
      if (!userId) throw new Error("User ID not found");

      const { data: settingsData, error: settingsError } = await supabase
        .from('config_settings')
        .select('*')
        .eq('config_id', configId);

      if (settingsError) {
        setFetchError('Could not fetch the config settings');
        setData([]);
        console.log("Supabase query error:", settingsError);
        return;
      }

      const { data: configTableData, error: configError } = await supabase
        .from('configs')
        .select('*')
        .eq('id', configId)
        .single();

      if (configError) {
        setFetchError('Could not fetch the config data');
        setConfigData(null);
        console.log("Supabase query error:", configError);
        return;
      }

      // Fetch audio settings
      const { data: audioData, error: audioError } = await supabase
        .from('audio_settings')
        .select('*')
        .eq('config_id', configId)
        .single();

      if (audioData) {
        setAudioSettings(audioData);
      }

      setData(settingsData);
      setConfigData(configTableData);
      setFetchError('');
    } catch (err) {
      console.error('Error fetching configurations:', err);
      setFetchError('An unexpected error occurred');
    }
  };

  const activeConfigs = useMemo(() => {
    if (!data || !isPlaying) return [];

    return data.filter(config => {
      if (config.setting_name.toLowerCase().includes('alpha')) {
        return alpha_band >= config.lower_range && alpha_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('beta')) {
        return beta_band >= config.lower_range && beta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('theta')) {
        return theta_band >= config.lower_range && theta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('delta')) {
        return delta_band >= config.lower_range && delta_band <= config.upper_range;
      } else if (config.setting_name.toLowerCase().includes('gamma')) {
        return gamma_band >= config.lower_range && gamma_band <= config.upper_range;
      } else {
        return false;
      }
    });
  }, [data, isPlaying, alpha_band, beta_band, theta_band, delta_band, gamma_band]);

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}>
        <View className="items-center w-full justify-center">
          <View className="w-full px-4 mt-2">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-row items-center bg-lightPurple px-2 py-1 w-20 rounded-xl">
              <Image
                source={icons.leftArrow}
                resizeMode="contain"
                tintColor="#47313E"
                className="w-4 h-4"
              />
              <Text className="text-white ml-3">Back</Text>
            </TouchableOpacity>
          </View>

          <Header
            title={"Play your configuration"}
            header={"Enjoy the performance!"}
          />

          <StartButton activeConfigs={activeConfigs} />

          {fetchError && (<Text className="text-red-500 mt-2">{fetchError}</Text>)}

          {data && data.length > 0 ? (
            <View className="flex-row flex-wrap justify-center w-full px-4">
              {data.map(config => {
                const isActive = activeConfigs.some(active => active.id === config.id);
                return (
                  <View key={config.id} className="w-44">
                    <ConfigPlay
                      name={config.setting_name}
                      lower={config.lower_range}
                      upper={config.upper_range}
                      color={config.color}
                      isActive={isActive}
                    />
                  </View>
                );
              })}
            </View>
          ) : (
            <Text className="mt-2 text-gray-500 italic">No configs found. Add a config to get started.</Text>
          )}

          {activeConfigs.length > 0 ? (
            <View className="items-center justify-center">
              {activeConfigs.map(config => (
                <View key={config.id}>
                  <ConfigDetails
                    name={config.setting_name}
                    brightness={config.brightness}
                    speed={config.speed}
                    direction={config.direction}
                    color={config.color}
                    selectedPanels={config.selected_panels}
                    x={configData?.panels_x}
                    y={configData?.panels_y}
                    lower={config.lower_intensity || 0}
                    upper={config.upper_intensity || 1}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Text className="mt-2 text-gray-500 italic">No configs being played right now.</Text>
          )}

          <View className="w-full px-4 mt-6">
            <Text className="text-base font-semibold mb-2">Live EEG Log</Text>
            <View className="bg-gray-100 p-3 rounded-xl max-h-64">
              <ScrollView>
                {logs.length === 0 ? (
                  <Text className="text-gray-400 italic">Waiting for EEG data...</Text>
                ) : (
                  logs.map((log, index) => (
                    <Text key={index} className="text-sm text-gray-700 mb-1">{log}</Text>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default PlayConfig;