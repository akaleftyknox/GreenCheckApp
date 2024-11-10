const corsMiddleware = require("../utils/corsMiddleware.js");

function normalizeBarcode(barcode) {
  const cleanBarcode = barcode.replace(/\D/g, '');
  const effectiveLength = cleanBarcode.replace(/^0+/, '').length;
  
  if (effectiveLength <= 7) {
    return cleanBarcode.padStart(8, '0');
  } else if (effectiveLength >= 9 && effectiveLength <= 12) {
    return cleanBarcode.padStart(13, '0');
  }
  return cleanBarcode;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchProductWithRetry(barcode, retries = 3, retryDelay = 2000) {
  while (retries > 0) {
    try {
      console.log('Fetching product data from Open Food Facts:', barcode);
      
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}`,
        {
          headers: {
            'User-Agent': 'GreenCheck - Android/iOS - Version 1.0',
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { notFound: true };
        }
        throw new Error(`OpenFoodFacts API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.product) {
        return { notFound: true };
      }

      return { 
        success: true, 
        data: {
          code: data.code,
          product_name: data.product.product_name,
          ingredients_text: data.product.ingredients_text,
          ingredients: data.product.ingredients || [],
          image_url: data.product.image_url,
          ingredients_analysis_tags: data.product.ingredients_analysis_tags,
          nutriscore_grade: data.product.nutriscore_grade,
          nova_group: data.product.nova_group,
          ecoscore_grade: data.product.ecoscore_grade,
          selected_images: data.product.selected_images,
          nutriments: data.product.nutriments
        }
      };
    } catch (error) {
      console.error(`Attempt failed - ${retries} retries remaining:`, error);
      if (retries === 1) throw error;
      await delay(retryDelay);
      retries -= 1;
    }
  }
}

const withWrapper = (handler) => async (req, res) => {
  console.log('Wrapper: Incoming request', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query
  });

  try {
    await handler(req, res);
    console.log('Wrapper: Handler executed successfully.');
  } catch (error) {
    console.error('Wrapper: Error during handler execution:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An unexpected error occurred.' });
    }
  }
};

const handler = async (req, res) => {
  if (req.method !== 'GET') {
    console.warn('Received non-GET request:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const barcode = req.query.barcode; // Using query parameter instead of path parameter

  if (!barcode) {
    console.warn('No barcode provided in query:', req.query);
    return res.status(400).json({ error: 'Barcode is required' });
  }

  try {
    const normalizedBarcode = normalizeBarcode(barcode);
    console.log('Normalized barcode:', normalizedBarcode);

    const result = await fetchProductWithRetry(normalizedBarcode);
    
    if (result.notFound) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.status(200).json(result.data);
  } catch (error) {
    console.error('Failed to fetch product data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch product data',
      details: error.message 
    });
  }
};

module.exports = {
  default: corsMiddleware(withWrapper(handler))
};