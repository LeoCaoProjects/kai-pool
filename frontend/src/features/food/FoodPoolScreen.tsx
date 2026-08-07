import { useEffect, useState } from "react";
import { Button, Pressable, ScrollView, Text, TextInput, View } from "react-native";

import { ApiError } from "../../api/client";
import { createFood, deleteFood, getFoods, updateFood } from "../../api/foods";
import {
  FOOD_AVAILABILITIES,
  type FoodAvailability,
  type FoodItem,
} from "../../types/models";

export default function FoodPoolScreen() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [availability, setAvailability] = useState<FoodAvailability>("PRIVATE");
  const [error, setError] = useState("");

  const loadFoods = async () => {
    try {
      setFoods(await getFoods());
      setError("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not load food");
    }
  };

  useEffect(() => {
    void loadFoods();
  }, []);

  const addFood = async () => {
    try {
      await createFood({ name, quantity, availability, imageUrl: null });
      setName("");
      setQuantity("");
      setAvailability("PRIVATE");
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not add food");
    }
  };

  const removeFood = async (id: number) => {
    try {
      await deleteFood(id);
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not delete food");
    }
  };

  const changeAvailability = async (food: FoodItem) => {
    const currentIndex = FOOD_AVAILABILITIES.indexOf(food.availability);
    const nextAvailability = FOOD_AVAILABILITIES[(currentIndex + 1) % FOOD_AVAILABILITIES.length];
    try {
      await updateFood(food.id, {
        name: food.name,
        imageUrl: food.imageUrl,
        quantity: food.quantity,
        availability: nextAvailability,
      });
      await loadFoods();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Could not update food");
    }
  };

  return (
    <ScrollView contentContainerStyle={{ gap: 12, padding: 16 }}>
      <Text style={{ fontSize: 24 }}>Food Pool</Text>
      <TextInput
        onChangeText={setName}
        placeholder="Food name"
        value={name}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <TextInput
        onChangeText={setQuantity}
        placeholder="Quantity"
        value={quantity}
        style={{ borderWidth: 1, padding: 10 }}
      />
      <Text>Availability: {availability}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FOOD_AVAILABILITIES.map((option) => (
          <Pressable key={option} onPress={() => setAvailability(option)}>
            <Text>{option === availability ? `[${option}]` : option}</Text>
          </Pressable>
        ))}
      </View>
      <Button title="Add food" onPress={addFood} />
      {error ? <Text>{error}</Text> : null}

      {foods.map((food) => (
        <View key={food.id} style={{ borderTopWidth: 1, gap: 6, paddingTop: 12 }}>
          <Text>{food.name}</Text>
          <Text>Quantity: {food.quantity}</Text>
          <Text>Availability: {food.availability}</Text>
          <Button title="Change availability" onPress={() => changeAvailability(food)} />
          <Button title="Delete" onPress={() => removeFood(food.id)} />
        </View>
      ))}
    </ScrollView>
  );
}
