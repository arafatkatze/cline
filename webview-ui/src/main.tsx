import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query" // Import react-query client and provider
import "./index.css"
import App from "./App.tsx"
import "../../node_modules/@vscode/codicons/dist/codicon.css"

// Create a client
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// Configure default options for queries if needed
			// For example, disable refetching on window focus globally
			refetchOnWindowFocus: false,
			// Set a default stale time if desired
			// staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
})

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		{/* Wrap the App component with the QueryClientProvider */}
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
)
