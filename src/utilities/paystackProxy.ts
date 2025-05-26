export const paystackProxy = async ({
    method,
    args,
    secretKey,
  }: {
    method: string
    args: any[]
    secretKey: string
  }): Promise<{ data?: any; message?: string; status: number }> => {
    const baseURL = 'https://api.paystack.co/'
    const url = new URL(method, baseURL)
  
    try {
      const res = await fetch(url.toString(), {
        method: args?.[0]?.method || 'GET',
        headers: {
          Authorization: `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: args?.[0]?.method === 'POST' ? JSON.stringify(args?.[0]?.body) : undefined,
      })
  
      const data = await res.json()
      return { data, status: res.status }
    } catch (err) {
      return { message: String(err), status: 500 }
    }
  }
  