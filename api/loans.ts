export const config = {
    runtime: 'edge',
}

const usRegionsISO3166_2 = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN',
    'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV',
    'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN',
    'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC',
]
  
const isValidUSRegionISO3166_2 = (regionCode: string): boolean => {
    return usRegionsISO3166_2.includes(regionCode)
}

const getGeolocation = (req: Request) => {
    return {
        country: req.headers.get('x-vercel-ip-country'),
        city: req.headers.get('x-vercel-ip-city'),
        region: req.headers.get('x-vercel-ip-country-region'),
        latitude: req.headers.get('x-vercel-ip-latitude'),
        longitude: req.headers.get('x-vercel-ip-longitude'),
    }
}

export async function GET(req: Request) {
    const API_KEY = process.env.GOOGLE_API_KEY
    const spreadsheetId = process.env.SPREADSHEET_ID
    const range = 'Sheet1!A:BQ'
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?key=${API_KEY}&alt=json`

    try {
        const response = await fetch(apiUrl)
        const sheetData = await response.json()

        if (!response.ok) {
            return new Response(JSON.stringify({error: sheetData.error.message}), {
                status: 500,
                headers: {'Content-Type': 'application/json'}
            })
        }

        const [headers, ...rows]: string[][] = sheetData.values

        let data = rows.map(row => {
            const rowObject: Record<string, string> = {}
            headers.forEach((header: string, index: number) => {
                if (header.trim()) {
                    rowObject[header] = row[index] || ''
                }
            })
            return rowObject
        })

        let filteredRegion: string | null = null
        const {region} = getGeolocation(req)
        if (region && isValidUSRegionISO3166_2(region)) {
            filteredRegion = region
            data = data.filter(row => {
                return row[region] == 'Y'
            })
        }


        return new Response(JSON.stringify({data, region: filteredRegion}), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'public, s-maxage=45, stale-while-revalidate=15',
                'Access-Control-Allow-Origin': '*',
            }
        })
    } catch {
        return new Response('', {status: 500})
    }
}
