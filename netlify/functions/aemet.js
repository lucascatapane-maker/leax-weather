exports.handler = async function(event, context) {
    const apiKey = process.env.AEMET_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Key missing" }) };
    }
    try {
        const initialRes = await fetch('https://opendata.aemet.es/opendata/api/red/pred_esp/altas/llsigwx', {
            headers: { 'api_key': apiKey }
        });
        const initialData = await initialRes.json();
        if (!initialData.datos) throw new Error("AEMET metadata error");

        const dataRes = await fetch(initialData.datos);
        const chartPayload = await dataRes.json();

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(chartPayload)
        };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
