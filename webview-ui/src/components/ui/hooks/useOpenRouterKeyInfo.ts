import axios from "axios"
import { z } from "zod"
import { useQuery, UseQueryOptions } from "@tanstack/react-query"

// Define schema for OpenRouter key response
const openRouterKeyInfoSchema = z.object({
	data: z.object({
		label: z.string().nullable(), // Label can be null
		usage: z.number(),
		is_free_tier: z.boolean(),
		is_provisioning_key: z.boolean(),
		rate_limit: z.object({
			requests: z.number(),
			interval: z.string(),
		}),
		limit: z.number().nullable(), // Limit can be null
	}),
})

export type OpenRouterKeyInfo = z.infer<typeof openRouterKeyInfoSchema>["data"]

async function getOpenRouterKeyInfo(apiKey?: string, baseUrl?: string): Promise<OpenRouterKeyInfo | null> {
	debugger
	if (!apiKey) return null

	try {
		debugger
		// Use the provided base URL or default to OpenRouter's API URL
		const apiBaseUrl = baseUrl || "https://openrouter.ai/api/v1"
		const keyEndpoint = `${apiBaseUrl}/key`

		const response = await axios.get(keyEndpoint, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
			timeout: 5000, // Add a timeout for the request
		})

		const result = openRouterKeyInfoSchema.safeParse(response.data)
		debugger
		if (!result.success) {
			console.error("OpenRouter API key info validation failed:", result.error.flatten())
			// Don't return null immediately, maybe it's a temporary issue or different structure
			// Check common error patterns if needed, but for now, log and return null
			return null
		}

		debugger
		return result.data.data
	} catch (error) {
		if (axios.isAxiosError(error)) {
			// Handle specific HTTP errors if necessary, e.g., 401 Unauthorized
			if (error.response?.status === 401) {
				console.warn("OpenRouter API key is invalid or unauthorized.")
			} else {
				console.error("Error fetching OpenRouter key info (Axios):", error.message)
			}
		} else {
			console.error("Error fetching OpenRouter key info (Unknown):", error)
		}
		return null
	}
}

// Define options type excluding queryKey and queryFn as they are managed internally
type UseOpenRouterKeyInfoOptions = Omit<UseQueryOptions<OpenRouterKeyInfo | null>, "queryKey" | "queryFn">

/**
 * Custom hook to fetch OpenRouter API key information.
 * @param apiKey The OpenRouter API key.
 * @param baseUrl Optional custom base URL for the OpenRouter API.
 * @param options Optional react-query options.
 * @returns The react-query query result containing the key info or null.
 */
export const useOpenRouterKeyInfo = (apiKey?: string, baseUrl?: string, options?: UseOpenRouterKeyInfoOptions) => {
	return useQuery<OpenRouterKeyInfo | null>({
		queryKey: ["openrouter-key-info", apiKey, baseUrl], // Unique query key
		queryFn: () => getOpenRouterKeyInfo(apiKey, baseUrl),
		staleTime: 30 * 1000, // Data is considered fresh for 30 seconds
		gcTime: 5 * 60 * 1000, // Cache data for 5 minutes
		enabled: !!apiKey, // Only run the query if an API key is provided
		retry: false, // Don't automatically retry on failure for key info
		refetchOnWindowFocus: false, // Don't refetch just because the window gained focus
		...options, // Spread any additional options provided
	})
}
