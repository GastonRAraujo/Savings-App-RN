import axios from 'axios';
import qs from 'qs';
import * as SecureStore from 'expo-secure-store';
import dolarMEP from './DolarMEP';

class IOLService {
    client: any;
    refreshToken: string = '';
    accessTokenExpiry: number = 0; // Timestamp of token expiry

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

    }
    
    // Add a request interceptor to ensure token is refreshed if expired
    private enableInterceptor() {
    this.client.interceptors.request.use(async (config: any) => {
        if (Date.now() >= this.accessTokenExpiry) {
            await this.refreshTokenIfNeeded();
        }
        return config;
    });
    }

    // Authenticate with username and password
    async authenticate(username: string, password: string) {
        try {
          const data = qs.stringify({
            username,
            password,
            grant_type: 'password',
          });
      
          const response = await this.client.post(
            '/token',
            data,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            }
          );
      
          this.setTokenData(response.data);
          this.enableInterceptor();
        } catch (error) {
          console.error('Error authenticating:', error);
          throw error;
        }
      }
    // Refresh the access token if needed using the stored refresh token
    async refreshTokenIfNeeded() {
        try {
            const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
            if (!storedRefreshToken) throw new Error('No refresh token stored');

            const response = await this.client.post('/token', null, {
                params: {
                    refresh_token: storedRefreshToken,
                    grant_type: 'refresh_token'
                }
            });
            this.setTokenData(response.data);
        } catch (error) {
            console.error('Error refreshing token:', error);
            throw error;
        }
    }

    // Store the tokens and set the header for subsequent requests
    private async setTokenData(data: any) {
        this.client.defaults.headers['Authorization'] = `Bearer ${data.access_token}`;
        this.refreshToken = data.refresh_token;
        this.accessTokenExpiry = Date.now() + data.expires_in * 1000;

        // Store tokens securely
        await SecureStore.setItemAsync('accessToken', data.access_token);
        await SecureStore.setItemAsync('refreshToken', data.refresh_token);
    }

    // Get the portfolio (list of assets)
    async getPortfolio() {
        try {
            const response = await this.client.get('/api/v2/portafolio/argentina');
            const exchangeRate = await dolarMEP.fetchMEPExchangeRate();  // Fetch exchange rate

            return response.data.activos.map((activo: any) => {
                if (['ObligacionesNegociables', 'TitulosPublicos', 'Letras'].includes(activo.titulo.tipo)
                    && activo.titulo.moneda.toLowerCase().includes('peso')) {
                    activo.ppc = activo.ppc / 100;
                    activo.ultimoPrecio = activo.ultimoPrecio / 100;
                  }

                  // Use a ternary operator to choose the correct fields based on moneda
                return activo.titulo.moneda.toLowerCase().includes('peso')
                    ? {
                        symbol: activo.titulo.simbolo,
                        description: activo.titulo.descripcion,
                        type: activo.titulo.tipo,
                        ppcARS: activo.ppc, // Purchase Price per unit in ARS
                        ppcUSD: activo.ppc / (exchangeRate ? exchangeRate.buyRate : 1),  // Convert to USD
                        amount: activo.cantidad, // Amount of stocks
                        latestPriceARS: activo.ultimoPrecio, // Last price per unit in ARS
                        latestPriceUSD: activo.ultimoPrecio / (exchangeRate ? exchangeRate.buyRate : 1) // Convert to USD
                    } 
                    : {
                        symbol: activo.titulo.simbolo,
                        description: activo.titulo.descripcion,
                        type: activo.titulo.tipo,
                        ppcARS: activo.ppc * (exchangeRate ? exchangeRate.sellRate : 1),  // Convert to ARS
                        ppcUSD: activo.ppc, // Purchase Price per unit in USD
                        amount: activo.cantidad, // Amount of stocks
                        latestPriceARS: activo.ultimoPrecio * (exchangeRate ? exchangeRate.sellRate : 1), // Convert to ARS
                        latestPriceUSD: activo.ultimoPrecio, // Last price per unit in USD
                    };
            });
        } catch (error) {
            console.error('Error fetching portfolio:', error);
            throw error;
        }
    }


    // Get all operations (buy/sell actions)
    async getOperations() {
        try {
            const response = await this.client.get('/api/v2/operaciones/argentina');
            return response.data.operaciones.map((operacion: any) => ({
                id: operacion.numero,
                date: operacion.fechaOrden,
                symbol: operacion.titulo.simbolo,
                type: operacion.tipo,
                price: operacion.precio,
                amount: operacion.cantidad
            }));
        } catch (error) {
            console.error('Error fetching operations:', error);
            throw error;
        }
    }
    
    async getTerminatedOperations(latestUpdate: string) {         
        try {
          const response = await this.client.get(`/api/v2/operaciones?filtro.estado=terminadas&filtro.fechaDesde=${latestUpdate}&filtro.pais=argentina`);
          if (response.status !== 200) {
            throw new Error(`Failed to fetch operations, status: ${response.status}`);
          }
          return response.data;
        } catch (error) {
          console.error('Error fetching terminated operations:', error);
          return [];
        }
      }      
  
    async getSymbolInfo(symbol: string) {
        try {
            const response = await this.client.get(`/api/v2/bCBA/Titulos/${symbol}`);
            return response.data;
        } catch (error) {
            console.error('Error fetching title info:', error);
            throw error;
        }
    }
    // Logout by deleting stored tokens
    async logout() {
        try {
            await SecureStore.deleteItemAsync('accessToken');
            await SecureStore.deleteItemAsync('refreshToken');
            console.log('Logged out successfully');
        } catch (error) {
            console.error('Error logging out:', error);
            throw error;
        }
    }
}

// Create an instance of IOLService with the base URL for API
const iolService = new IOLService('https://api.invertironline.com');

// Export the instance for use throughout the app
export default iolService;
