"use client"

import { SWRConfig } from "swr"
import axios from "@/lib/axios"

export const SWRProvider = ({ children }: { children: React.ReactNode }) => {
    return (
        <SWRConfig
            value={{
                fetcher: (url: string) => axios.get(url).then((res) => res.data),
                revalidateOnFocus: false,
                revalidateOnReconnect: true,
                shouldRetryOnError: false,
                dedupingInterval: 5000, // 5 seconds
            }}
        >
            {children}
        </SWRConfig>
    )
}
