import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Header from '@/components/Header';
import { icons } from '@/constants';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useConfigStore, AudioItem } from '@/store';
import AudioSelector from '@/components/audio/AudioSelector';
import { Dimensions } from 'react-native';

const CreateAudioDetails = () => {
  const params = useLocalSearchParams();

  // Get configId from global store instead of params
  const configId = useConfigStore(state => state.configId);
  const name = useConfigStore(state => state.name);
  const setHasAudio = useConfigStore(state => state.setHasAudio);
  const setAudioItems = useConfigStore(state => state.setAudioItems);

  const [selectedAudio, setSelectedAudio] = useState<AudioItem[]>([]);
  const [usePresetAudio, setUsePresetAudio] = useState(true);
  const [isLoading, setIsLoading] = useState(configId ? true : false);

  // Initialize audio module
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
          shouldDuckAndroid: true,
        });
        console.log("Audio module initialized successfully");
      } catch (error) {
        console.error("Error initializing audio module:", error);
      }
    };

    setupAudio();
  }, []);

  // Fetch config settings if editing
  useEffect(() => {
    if (configId) {
      fetchAudioSettings();
    } else {
      setIsLoading(false);
    }
  }, [configId]);

  const fetchAudioSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('audio_settings')
        .select('*')
        .eq('config_id', configId);

      if (error) throw error;

      if (data && data.length > 0) {
        const audioSettings = data[0];
        setUsePresetAudio(audioSettings.use_preset);

        // Parse stored audio items
        if (audioSettings.audio_items) {
          try {
            const parsedItems = JSON.parse(audioSettings.audio_items);
            setSelectedAudio(parsedItems);
          } catch (e) {
            console.error('Error parsing audio items:', e);
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching audio settings:', error);
      setIsLoading(false);
    }
  };

  const handleAudioChange = (audios: AudioItem[]) => {
    setSelectedAudio(audios);
    setUsePresetAudio(audios.some(audio => audio.isPreset));
  };

  const analyzeAndSortAudio = () => {
    // For now, this is a placeholder. In a real app, you would analyze pitch
    // Here we're just sorting by index for presets or filename for uploads
    return [...selectedAudio].sort((a, b) => {
      if (a.isPreset && b.isPreset) {
        return Number(a.id) - Number(b.id);
      } else if (!a.isPreset && !b.isPreset) {
        return a.name.localeCompare(b.name);
      } else {
        return a.isPreset ? -1 : 1;
      }
    });
  };

  const saveAudioConfiguration = async () => {
    try {
      if (selectedAudio.length < 3) {
        Alert.alert('Not Enough Audio', 'Please select at least 3 audio clips');
        return;
      }

      // Sort audio by pitch (or our placeholder implementation)
      const sortedAudio = analyzeAndSortAudio();

      // Update global state
      setAudioItems(sortedAudio);
      setHasAudio(true);

      // Prepare data for saving to DB later when the config is saved
      const audioSettings = {
        config_id: configId || null,
        use_preset: usePresetAudio,
        audio_items: JSON.stringify(sortedAudio),
        created_at: new Date().toISOString()
      };

      // Only save to database if we have a configId (editing an existing config)
      if (configId) {
        // First check if audio settings already exist for this config_id
        const { data: existingData, error: checkError } = await supabase
          .from('audio_settings')
          .select('id')
          .eq('config_id', configId);

        if (checkError) throw checkError;

        if (existingData && existingData.length > 0) {
          // Update existing audio settings
          const { error } = await supabase
            .from('audio_settings')
            .update(audioSettings)
            .eq('config_id', configId);

          if (error) throw error;
        } else {
          // Insert new audio settings for existing config
          const { error } = await supabase
            .from('audio_settings')
            .insert([audioSettings]);

          if (error) throw error;
        }
      }

      // Success message
      Alert.alert(
        "Success",
        "Audio configuration saved to configuration",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error saving audio configuration:', error);
      Alert.alert('Error', 'Failed to save audio configuration');
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (isLoading) {
    return (
      <SafeAreaView className="bg-white h-full">
        <View className="flex-1 justify-center items-center">
          <Text>Loading audio configuration...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-white h-full">
      <ScrollView contentContainerStyle={{flexGrow: 1, paddingBottom: 20}}>
        <View className="items-center w-full justify-center">
          <View className="w-full px-4 mt-2">
            <TouchableOpacity
              onPress={handleBack}
              className="flex-row items-center bg-lightPurple px-2 py-1 w-20 rounded-xl"
            >
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
            title="Audio Configuration"
            header={`Choose sounds for "${name || 'your sculpture'}"`}
          />

          <View className="w-11/12 px-4">
            <AudioSelector
              onAudioSelected={handleAudioChange}
              initialAudios={selectedAudio}
              maxItems={10}
              preset={usePresetAudio}
            />

            {/* Save Button */}
            <TouchableOpacity
              onPress={saveAudioConfiguration}
              className={`mt-8 h-12 w-full rounded-xl ${
                selectedAudio.length >= 3 ? 'bg-darkPurple' : 'bg-gray-400'
              } justify-center items-center`}
              disabled={selectedAudio.length < 3}
            >
              <View className="flex-row items-center justify-between px-6">
                <Text className="text-white font-medium items-center flex-1 text-center">
                  Save audio configuration
                </Text>
                <Image
                  source={icons.bookmark}
                  tintColor="white"
                  resizeMode="contain"
                  className="w-5 h-5"
                />
              </View>
            </TouchableOpacity>

            <View className="mt-4 bg-blue-50 p-3 rounded-lg">
              <Text className="text-darkPurple italic text-center">
                Audio will be saved to your configuration. You'll still need to save the full configuration on the configuration page.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default CreateAudioDetails;