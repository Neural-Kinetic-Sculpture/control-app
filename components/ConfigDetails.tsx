import { View, Text } from 'react-native'
import React from 'react'

const ConfigDetails = ({name, brightness, speed, direction, color, selectedPanels, x, y, lower, upper}) => {
    const waveType = name.match(/^[A-Za-z]+/)?.[0] || name;
    const displayText = `${waveType} with an intensity from (${lower}-${upper})`;
  return (
    <View className="pt-4 w-full px-3">
      <View className="items-center mb-2">
        <View className="flex-row items-center">
          <Text className="font-bold text-black">Playing: </Text>
          <Text className="">{displayText}</Text>
        </View>
      </View>

      <View className="w-96 border-b-[1px] border-black" />

      <View className="items-center">
        <View className="flex-row items-center pt-2">
            <Text className="font-medium text-black">Brightness: </Text>
            <Text className="">{brightness}%</Text>
        </View>

        <View className="flex-row items-center">
            <Text className="font-medium text-black">Speed: </Text>
            <Text className="">{speed} m/s</Text>
        </View>

        <View className="flex-row items-center pb-1">
            <Text className="font-medium text-black">Direction: </Text>
            <Text className="">{direction}</Text>
        </View>
      </View>

      <View className="items-center">
        {Array.from({ length: parseInt(y) || 0 }).map((_, row) => (
          <View key={row} className="flex-row">
            {Array.from({ length: parseInt(x) || 0 }).map((_, col) => {
              const isSelected = selectedPanels.includes(`${row}-${col}`);
              return (
                <View
                    key={`${row}-${col}`}
                    className={`w-12 h-12 m-1 rounded-lg border-[1px] border-gray-300 ${
                        isSelected ? '' : 'bg-gray-100'
                    }`}
                    style={isSelected ? { backgroundColor: color } : {}}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  )
}

export default ConfigDetails