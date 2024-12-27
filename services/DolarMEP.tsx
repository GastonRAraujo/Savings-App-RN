import axios from 'axios';

const dolarMEP = {
    exchangeRate: null as { buyRate: number; sellRate: number; updatedAt: string } | null,

    async fetchMEPExchangeRate() {
        if (!this.exchangeRate) {
            try {
                const response = await axios.get('https://dolarapi.com/v1/dolares/bolsa');
                const { compra, venta, fechaActualizacion } = response.data;

                this.exchangeRate = {
                    buyRate: compra,
                    sellRate: venta,
                    updatedAt: fechaActualizacion,
                };
            } catch (error) {
                console.error('Error fetching MEP exchange rate:', error);
                throw error;
            }
        }

        return this.exchangeRate;
    },
};

export default dolarMEP;
