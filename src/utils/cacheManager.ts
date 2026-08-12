import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheManager = {
  /**
   * Retrieves data from the local cache.
   * @param key The unique cache key.
   * @returns The parsed JSON data or null if not found.
   */
  get: async <T>(key: string): Promise<T | null> => {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn(`Error reading cache for key: ${key}`, error);
      return null;
    }
  },

  /**
   * Saves data to the local cache.
   * @param key The unique cache key.
   * @param data The data to stringify and save.
   */
  set: async (key: string, data: any): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn(`Error setting cache for key: ${key}`, error);
    }
  },

  /**
   * Removes specific item from the local cache.
   * @param key The unique cache key.
   */
  remove: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing cache for key: ${key}`, error);
    }
  }
};
