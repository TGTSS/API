import axios from "axios";

const retryRequest = async (url, options = {}, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, options);
      return response;
    } catch (error) {
      if (error.response && error.response.status === 429 && i < retries - 1) {
        console.warn(
          `Limite de taxa atingido. Tentando novamente em ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Aumenta o atraso exponencialmente
      } else {
        throw error;
      }
    }
  }
};

export default retryRequest;
