import { useMemo, useState, useEffect } from "react"
import { BrowserActionResult, ClineMessage } from "@shared/ExtensionMessage"
import { BrowserSettings } from "@shared/BrowserSettings"

interface UseBrowserSessionPagesArgs {
	messages: ClineMessage[]
	browserSettings: BrowserSettings
}

interface BrowserPage {
	currentState: {
		url?: string
		screenshot?: string
		mousePosition?: string
		consoleLogs?: string
		messages: ClineMessage[] // messages up to and including the result
	}
	nextAction?: {
		messages: ClineMessage[] // messages leading to next result
	}
}

interface DisplayState {
	url: string
	mousePosition: string
	consoleLogs?: string
	screenshot?: string
}

export const useBrowserSessionPages = ({ messages, browserSettings }: UseBrowserSessionPagesArgs) => {
	// Organize messages into pages with current state and next action
	const pages = useMemo(() => {
		const result: BrowserPage[] = []

		let currentStateMessages: ClineMessage[] = []
		let nextActionMessages: ClineMessage[] = []

		messages.forEach((message) => {
			if (message.ask === "browser_action_launch" || message.say === "browser_action_launch") {
				// Start first page
				currentStateMessages = [message]
			} else if (message.say === "browser_action_result") {
				if (message.text === "") {
					// first browser_action_result is an empty string that signals that session has started
					return
				}
				// Complete current state
				currentStateMessages.push(message)
				// TODO: Add safe JSON parsing here later
				const resultData = JSON.parse(message.text || "{}") as BrowserActionResult

				// Add page with current state and previous next actions
				result.push({
					currentState: {
						url: resultData.currentUrl,
						screenshot: resultData.screenshot,
						mousePosition: resultData.currentMousePosition,
						consoleLogs: resultData.logs,
						messages: [...currentStateMessages],
					},
					nextAction:
						nextActionMessages.length > 0
							? {
									messages: [...nextActionMessages],
								}
							: undefined,
				})

				// Reset for next page
				currentStateMessages = []
				nextActionMessages = []
			} else if (message.say === "api_req_started" || message.say === "text" || message.say === "browser_action") {
				// These messages lead to the next result, so they should always go in nextActionMessages
				nextActionMessages.push(message)
			} else {
				// Any other message types
				currentStateMessages.push(message)
			}
		})

		// Add incomplete page if exists
		if (currentStateMessages.length > 0 || nextActionMessages.length > 0) {
			result.push({
				currentState: {
					messages: [...currentStateMessages],
				},
				nextAction:
					nextActionMessages.length > 0
						? {
								messages: [...nextActionMessages],
							}
						: undefined,
			})
		}

		return result
	}, [messages])

	// Auto-advance to latest page
	const [currentPageIndex, setCurrentPageIndex] = useState(0)
	useEffect(() => {
		setCurrentPageIndex(pages.length - 1)
	}, [pages.length])

	// Get initial URL from launch message
	const initialUrl = useMemo(() => {
		const launchMessage = messages.find((m) => m.ask === "browser_action_launch" || m.say === "browser_action_launch")
		return launchMessage?.text || ""
	}, [messages])

	// Find the latest available URL and screenshot
	const latestState = useMemo(() => {
		for (let i = pages.length - 1; i >= 0; i--) {
			const page = pages[i]
			if (page.currentState.url || page.currentState.screenshot) {
				return {
					url: page.currentState.url,
					mousePosition: page.currentState.mousePosition,
					consoleLogs: page.currentState.consoleLogs,
					screenshot: page.currentState.screenshot,
				}
			}
		}
		return {
			url: undefined,
			mousePosition: undefined,
			consoleLogs: undefined,
			screenshot: undefined,
		}
	}, [pages])

	const currentPage = pages[currentPageIndex]
	const isLastPage = currentPageIndex === pages.length - 1

	const defaultMousePosition = `${browserSettings.viewport.width * 0.7},${browserSettings.viewport.height * 0.5}`

	// Use latest state if we're on the last page and don't have a state yet
	const displayState: DisplayState = useMemo(() => {
		return isLastPage
			? {
					url: currentPage?.currentState.url || latestState.url || initialUrl,
					mousePosition: currentPage?.currentState.mousePosition || latestState.mousePosition || defaultMousePosition,
					consoleLogs: currentPage?.currentState.consoleLogs || latestState.consoleLogs, // Ensure console logs also use latestState
					screenshot: currentPage?.currentState.screenshot || latestState.screenshot,
				}
			: {
					url: currentPage?.currentState.url || initialUrl,
					mousePosition: currentPage?.currentState.mousePosition || defaultMousePosition,
					consoleLogs: currentPage?.currentState.consoleLogs,
					screenshot: currentPage?.currentState.screenshot,
				}
	}, [currentPage, isLastPage, latestState, initialUrl, defaultMousePosition])

	return {
		pages,
		currentPageIndex,
		setCurrentPageIndex,
		currentPage,
		isLastPage,
		displayState,
		initialUrl,
		// latestState // Not strictly needed externally if displayState covers all cases
	}
}
