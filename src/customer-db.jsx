"use client"

import { useState, useEffect } from "react"
// import { User, Search, Trash2, Save, X, MessageSquare, Calendar } from "lucide-react"
import { User, Search, Trash2, Save, X, MessageSquare, Calendar, Image as ImageIcon } from "lucide-react"
// import { useAuth } from "./Context/AuthContext" // Import useAuth hook

const CustomerDb = () => {
  // State for customer data and UI
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [customerList, setCustomerList] = useState([])
  const [tableHeaders, setTableHeaders] = useState([])
  const [filteredHeaders, setFilteredHeaders] = useState([]) // New state for filtered headers
  const [searchTerm, setSearchTerm] = useState("")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingCustomerId, setEditingCustomerId] = useState(null)
  const [newCustomer, setNewCustomer] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  })
  // const { user } = useAuth()

  // Add state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [customerToDelete, setCustomerToDelete] = useState(null)

  // Add state for edit form modal
  const [showEditForm, setShowEditForm] = useState(false)

  // Add new state variables
  const [selectedCustomers, setSelectedCustomers] = useState([])
  const [showSendMessageModal, setShowSendMessageModal] = useState(false)
  const [messageType, setMessageType] = useState("active")
  const [selectedPromoCard, setSelectedPromoCard] = useState(null)
  const [promoCards, setPromoCards] = useState([])
  const [loadingPromoCards, setLoadingPromoCards] = useState(false)

  // Add state for WhatsApp templates and loading state
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [customMessage, setCustomMessage] = useState("")
  const [templates, setTemplates] = useState([])

  // Google Sheet Details - Replace with your actual sheet ID
  // const sheetId = '1ghSQ9d2dfSotfnh8yrkiqIT00kg_ej7n0pnygzP0B9w';
  const sheetId = "1ghSQ9d2dfSotfnh8yrkiqIT00kg_ej7n0pnygzP0B9w"
  const scriptUrl =
    "https://script.google.com/macros/s/AKfycbx-5-79dRjYuTIBFjHTh3_Q8WQa0wWrRKm7ukq5854ET9OCHiAwno-gL1YmZ9juotMH/exec"
  const sheetName = "Booking DB"
  const templateSheetName = "Whatsapp Temp"

  // const convertGoogleDriveImageUrl = (originalUrl) => {
  //   if (!originalUrl || typeof originalUrl !== 'string') {
  //     return null;
  //   }
  
  //   if (!originalUrl.includes("drive.google.com")) {
  //     return originalUrl;
  //   }
  
  //   const fileIdMatch = originalUrl.match(/\/d\/([^/]+)|id=([^&]+)/);
  //   const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] : null;
  
  //   if (!fileId) return originalUrl;
  
  //   return [
  //     `https://lh3.googleusercontent.com/d/${fileId}`,
  //     `https://drive.google.com/uc?export=view&id=${fileId}`,
  //     `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
  //     `https://drive.google.com/uc?id=${fileId}`,
  //     originalUrl,
  //   ];
  // };
  

  // Fetch customer data from Google Sheet
  useEffect(() => {
    let isMounted = true; // Add cleanup flag
    
    const fetchGoogleSheetData = async () => {
      try {
        setLoading(true)
        console.log("Starting to fetch Google Sheet data...")
  
        const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  
        const response = await fetch(url)
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.status}`)
        }
  
        const text = await response.text()
        const jsonStart = text.indexOf("{")
        const jsonEnd = text.lastIndexOf("}")
        const jsonString = text.substring(jsonStart, jsonEnd + 1)
        const data = JSON.parse(jsonString)
  
        if (!isMounted) return; // Check if component is still mounted
  
        if (!data.table || !data.table.cols || data.table.cols.length === 0) {
          setError("No data found in the sheet")
          setLoading(false)
          return
        }
  

        let headers = []
        let allRows = data.table.rows || []

        if (data.table.cols && data.table.cols.some((col) => col.label)) {
          // Filter out delete column
          headers = data.table.cols
            .map((col, index) => ({
              id: `col${index}`,
              label: col.label || `Column ${index + 1}`,
              type: col.type || "string",
              originalIndex: index, // Store the original index for reference
            }))
            .filter((header, index) => {
              // Skip the delete flag column if it exists
              return !header.label.toLowerCase().includes("delete")
            })
        } else if (allRows.length > 0 && allRows[0].c && allRows[0].c.some((cell) => cell && cell.v)) {
          // Filter out delete column
          headers = allRows[0].c
            .map((cell, index) => ({
              id: `col${index}`,
              label: cell && cell.v ? String(cell.v) : `Column ${index + 1}`,
              type: data.table.cols[index]?.type || "string",
              originalIndex: index, // Store the original index for reference
            }))
            .filter((header) => {
              // Skip the delete flag column if it exists
              return !header.label.toLowerCase().includes("delete")
            })
          allRows = allRows.slice(1)
        }

        // We'll store all headers in tableHeaders for form usage
        setTableHeaders(headers)

        // Filter headers to show Customer Name (column E), Mobile (column D), F, and K (originalIndex 4, 3, 5, 10)
        // Re-ordering columns as per requirements
        const nameColumnIndex = 4 // Column E (0-indexed)
        const mobileColumnIndex = 3 // Column D (0-indexed)
        const attendanceDateColumnIndex = 5 // Column F (0-indexed)
        const otherColumnIndex = 10 // Column K (0-indexed)

        // Re-order columns: Name first, then Mobile, then attendance date, then other
        const filtered = [
          headers.find((header) => header.originalIndex === nameColumnIndex),
          headers.find((header) => header.originalIndex === mobileColumnIndex),
          headers.find((header) => header.originalIndex === attendanceDateColumnIndex),
          headers.find((header) => header.originalIndex === otherColumnIndex),
        ].filter(Boolean) // Remove any undefined values

        setFilteredHeaders(filtered)

        // Initialize new customer with empty values for all headers
        const emptyCustomer = {}
        headers.forEach((header) => {
          emptyCustomer[header.id] = ""
        })
        setNewCustomer(emptyCustomer)

        // Define the index for the "deleted" flag column
        const deletedColumnIndex = data.table.cols.findIndex(
          (col) => col.label && col.label.toLowerCase().includes("delete"),
        )

        // Find the indexes for customer name (column C) and mobile number (column D)
        const nameColumnIndex2 = 2 // Column C (0-indexed)
        const mobileColumnIndex2 = 3 // Column D (0-indexed)

        // Track seen combinations of name and mobile
        const seenCustomers = new Map()

        // Get current date for days calculation
        const today = new Date()

        const customerData = allRows
          .filter((row) => {
            // Only include rows where delete column is NOT "Yes" (exclude deleted customers)
            const isDeleted =
              deletedColumnIndex !== -1 &&
              row.c &&
              row.c.length > deletedColumnIndex &&
              row.c[deletedColumnIndex] &&
              row.c[deletedColumnIndex].v === "Yes"

            return !isDeleted && row.c && row.c.some((cell) => cell && cell.v)
          })
          .map((row, rowIndex) => {
            const customerData = {
              _id: Math.random().toString(36).substring(2, 15),
              _rowIndex: rowIndex + 2, // +2 because of header row and 1-indexed
            }

            row.c &&
              row.c.forEach((cell, index) => {
                // Skip delete column
                if (deletedColumnIndex !== -1 && index === deletedColumnIndex) return

                // Find the corresponding header for this column
                const header = headers.find((h) => h.originalIndex === index)
                if (!header) return

                // Handle date values
                if (cell && cell.v && cell.v.toString().indexOf("Date") === 0) {
                  const dateString = cell.v.toString()
                  const dateParts = dateString.substring(5, dateString.length - 1).split(",")

                  if (dateParts.length >= 3) {
                    const year = Number.parseInt(dateParts[0])
                    const month = Number.parseInt(dateParts[1]) + 1
                    const day = Number.parseInt(dateParts[2])

                    // Format as DD/MM/YYYY
                    customerData[header.id] =
                      `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
                  } else {
                    customerData[header.id] = cell.v
                  }
                } else {
                  // Handle non-date values
                  customerData[header.id] = cell ? cell.v : ""

                  if (header.type === "number" && !isNaN(customerData[header.id])) {
                    customerData[header.id] = Number(customerData[header.id]).toLocaleString()
                  }
                }
              })

            // Calculate status based on column F (attendance date) - if it's within 2 months, they're active
            const dateHeaderF = headers.find((h) => h.originalIndex === 5) // column F (0-indexed)
            if (dateHeaderF && customerData[dateHeaderF.id]) {
              // Parse the date from DD/MM/YYYY format
              const dateParts = customerData[dateHeaderF.id].split("/")
              if (dateParts.length === 3) {
                const lastAttendanceDate = new Date(
                  Number.parseInt(dateParts[2]), // Year
                  Number.parseInt(dateParts[1]) - 1, // Month (0-indexed)
                  Number.parseInt(dateParts[0]), // Day
                )

                // Get date from 2 months ago
                const twoMonthsAgo = new Date()
                twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

                // Compare dates to determine status
                customerData._status = lastAttendanceDate >= twoMonthsAgo ? "Active" : "Inactive"

                // Calculate days since last visit
                const timeDiff = today.getTime() - lastAttendanceDate.getTime()
                customerData._daysSinceLastVisit = Math.floor(timeDiff / (1000 * 3600 * 24))
              } else {
                customerData._status = "Unknown"
                customerData._daysSinceLastVisit = "N/A"
              }
            } else {
              customerData._status = "No Data"
              customerData._daysSinceLastVisit = "N/A"
            }

            return customerData
          })

        // Filter for unique customers based on name (column C) and mobile (column D)
        const nameHeader = headers.find((h) => h.originalIndex === nameColumnIndex2)
        const mobileHeader = headers.find((h) => h.originalIndex === mobileColumnIndex2)

        const nameHeaderId = nameHeader ? nameHeader.id : null
        const mobileHeaderId = mobileHeader ? mobileHeader.id : null

        // Only proceed with uniqueness filter if we found the right columns
        let uniqueCustomerData = customerData

        if (nameHeaderId && mobileHeaderId) {
          const uniqueMap = new Map()

          // Process customers in reverse order to keep the latest entry
          // (assuming the data is sorted with newest entries at the bottom)
          for (let i = customerData.length - 1; i >= 0; i--) {
            const customer = customerData[i]
            const name = customer[nameHeaderId]?.toString().toLowerCase().trim() || ""
            const mobile = customer[mobileHeaderId]?.toString().toLowerCase().trim() || ""

            // Create a unique key combining name and mobile
            const uniqueKey = `${name}|${mobile}`

            // Only add this customer if we haven't seen this combination before
            if (name && mobile && !uniqueMap.has(uniqueKey)) {
              uniqueMap.set(uniqueKey, customer)
            }
          }

          // Convert map values back to array
          uniqueCustomerData = Array.from(uniqueMap.values())
        }

        setCustomerList(uniqueCustomerData)
        setLoading(false)

        // Fetch WhatsApp templates
        if (isMounted) {
          await fetchWhatsAppTemplates()
          await fetchPromoCards()
        }
      } catch (error) {
        console.error("Error fetching Google Sheet data:", error)
        setError("Failed to load customer data")
        setLoading(false)
      }
    }

    fetchGoogleSheetData()
    return () => {
      isMounted = false;
    }
  }, [])

  // Function to fetch WhatsApp templates from the Whatsapp Temp sheet
  // Function to fetch WhatsApp templates from the Whatsapp Temp sheet
const fetchWhatsAppTemplates = async () => {
  try {
    setLoadingTemplates(true)
    console.log("Fetching WhatsApp templates...")

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(templateSheetName)}`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch WhatsApp templates: ${response.status}`)
    }

    const text = await response.text()
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}")
    const jsonString = text.substring(jsonStart, jsonEnd + 1)
    const data = JSON.parse(jsonString)

    if (!data.table || !data.table.cols || data.table.cols.length === 0) {
      console.log("No templates found in the sheet")
      setTemplates([])
      setLoadingTemplates(false)
      return
    }

    // Update the column indexes for the Whatsapp Temp sheet
    const idIndex = 0 // Column A - ID
    const nameIndex = 1 // Column B - Template Name
    const messageIndex = 2 // Column C - Combined Message
    const createdAtIndex = 3 // Column D - Created At
    const deletedIndex = 4 // Column E - Delete flag
    const imageUrlIndex = 5 // Column F - Image URL (0-based index, so F = 5)

    console.log("Column structure:", data.table.cols.map((col, index) => `${index}: ${col.label}`))

    const templatesData = data.table.rows
      .filter((row) => {
        // Skip deleted templates
        const isDeleted =
          row.c && row.c.length > deletedIndex && row.c[deletedIndex] && row.c[deletedIndex].v === "Yes"
        return !isDeleted && row.c && row.c.some((cell) => cell && cell.v)
      })
      .map((row, rowIndex) => {
        // Extract image URL from column F (index 5)
        let imageUrl = null
        if (row.c && row.c[imageUrlIndex] && row.c[imageUrlIndex].v) {
          imageUrl = String(row.c[imageUrlIndex].v).trim()
          console.log(`Template ${rowIndex} image URL from sheet:`, imageUrl)
          
          // Convert Google Drive URLs to proper format if needed
          if (imageUrl.includes("drive.google.com")) {
            // Extract file ID and convert to proper format
            const fileIdMatch = imageUrl.match(/\/d\/([^/]+)|id=([^&]+)/);
            const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] : null;
            
            if (fileId) {
              // Use the export=download format you mentioned
              imageUrl = `https://drive.google.com/uc?id=${fileId}&export=download`
              console.log(`Converted image URL:`, imageUrl)
            }
          }
        }

        const template = {
          id: row.c && row.c[idIndex] && row.c[idIndex].v ? String(row.c[idIndex].v) : `template-${rowIndex}`,
          name: row.c && row.c[nameIndex] && row.c[nameIndex].v ? String(row.c[nameIndex].v) : "Unnamed Template",
          type: "active",
          message: row.c && row.c[messageIndex] && row.c[messageIndex].v ? String(row.c[messageIndex].v) : "",
          imageUrl: imageUrl, // Use the processed image URL
        }
        
        console.log(`Template ${rowIndex} final data:`, template)
        return template
      })

    console.log("Fetched WhatsApp templates:", templatesData)
    setTemplates(templatesData)
    setLoadingTemplates(false)
  } catch (error) {
    console.error("Error fetching WhatsApp templates:", error)
    setTemplates([])
    setLoadingTemplates(false)
  }
}

  const handlePromoCardChange = (e) => {
    const selected = promoCards.find((card) => card.id === e.target.value)
    setSelectedPromoCard(selected || null)
  }

  const isPromoCardExpired = (promoCard) => {
    if (!promoCard.expiry) return false
    
    const today = new Date()
    
    // Parse DD/MM/YYYY format
    if (promoCard.expiry.includes('/')) {
      const [day, month, year] = promoCard.expiry.split('/').map(Number)
      const expiryDate = new Date(year, month - 1, day)
      return today > expiryDate
    }
    
    return false
  }

  

  // Function to fetch promo cards
  // Replace your existing fetchPromoCards function with this updated version
const fetchPromoCards = async () => {
  try {
    setLoadingPromoCards(true)
    console.log("Fetching promo cards...")

    const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=Promo Cards`

    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch promo cards: ${response.status}`)
    }

    const text = await response.text()
    const jsonStart = text.indexOf("{")
    const jsonEnd = text.lastIndexOf("}")
    const jsonString = text.substring(jsonStart, jsonEnd + 1)
    const data = JSON.parse(jsonString)

    if (!data.table || !data.table.cols || data.table.cols.length === 0) {
      console.log("No promo cards found in the sheet")
      setPromoCards([])
      setLoadingPromoCards(false)
      return
    }

    // Define column indexes - Column E should be index 4 (0-based)
    const codeIndex = data.table.cols.findIndex((col) => col.label && col.label.toLowerCase().includes("code"))
    const discountIndex = data.table.cols.findIndex(
      (col) => col.label && col.label.toLowerCase().includes("discount"),
    )
    const descriptionIndex = data.table.cols.findIndex(
      (col) => col.label && col.label.toLowerCase().includes("description"),
    )
    const deletedIndex = data.table.cols.findIndex((col) => col.label && col.label.toLowerCase().includes("delete"))
    
    // For column E (index 4), or find by expiry/valid until labels
    let expiryIndex = 4; // Default to column E (0-based index)
    const foundExpiryIndex = data.table.cols.findIndex(
      (col) =>
        col.label && (col.label.toLowerCase().includes("expiry") || col.label.toLowerCase().includes("valid until")),
    )
    if (foundExpiryIndex !== -1) {
      expiryIndex = foundExpiryIndex;
    }

    console.log("Expiry column index:", expiryIndex); // Debug log

    const today = new Date()

    const promoCardsData = data.table.rows
      .filter((row) => {
        // Skip deleted promo cards
        const isDeleted =
          deletedIndex !== -1 &&
          row.c &&
          row.c.length > deletedIndex &&
          row.c[deletedIndex] &&
          row.c[deletedIndex].v === "Yes"

        // Check if the promo card is expired
        let isExpired = false
        if (expiryIndex !== -1 && row.c && row.c[expiryIndex] && row.c[expiryIndex].v) {
          const expiryValue = row.c[expiryIndex].v;
          console.log("Raw expiry value:", expiryValue); // Debug log
          
          // Handle different date formats
          if (expiryValue.toString().indexOf("Date") === 0) {
            // Google Sheets Date object format
            const dateString = expiryValue.toString()
            const dateParts = dateString.substring(5, dateString.length - 1).split(",")

            if (dateParts.length >= 3) {
              const year = Number.parseInt(dateParts[0])
              const month = Number.parseInt(dateParts[1]) // 0-indexed month
              const day = Number.parseInt(dateParts[2])

              const expiryDate = new Date(year, month, day)
              isExpired = today > expiryDate
            }
          } else if (typeof expiryValue === "string") {
            // Handle YYYY-MM-DD format (like "2025-04-30")
            if (expiryValue.includes('-') && expiryValue.length === 10) {
              const [year, month, day] = expiryValue.split('-').map(Number)
              const expiryDate = new Date(year, month - 1, day) // month is 0-indexed
              isExpired = today > expiryDate
            }
            // Handle DD/MM/YYYY format
            else if (expiryValue.includes('/')) {
              const dateParts = expiryValue.split("/")
              if (dateParts.length === 3) {
                const day = Number.parseInt(dateParts[0])
                const month = Number.parseInt(dateParts[1]) - 1 // 0-indexed month
                const year = Number.parseInt(dateParts[2])

                const expiryDate = new Date(year, month, day)
                isExpired = today > expiryDate
              }
            }
          }
        }

        return !isDeleted && !isExpired && row.c && row.c.some((cell) => cell && cell.v)
      })
      .map((row, rowIndex) => {
        // Get expiry date and format it as DD/MM/YYYY
        let expiryDate = ''
        if (expiryIndex !== -1 && row.c && row.c[expiryIndex] && row.c[expiryIndex].v) {
          const expiryValue = row.c[expiryIndex].v;
          
          if (expiryValue.toString().indexOf("Date") === 0) {
            // Google Sheets Date object format
            const dateString = expiryValue.toString()
            const dateParts = dateString.substring(5, dateString.length - 1).split(",")
            if (dateParts.length >= 3) {
              const year = Number.parseInt(dateParts[0])
              const month = Number.parseInt(dateParts[1]) + 1 // Convert from 0-indexed
              const day = Number.parseInt(dateParts[2])
              expiryDate = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
            }
          } else if (typeof expiryValue === "string") {
            // Handle YYYY-MM-DD format (like "2025-04-30")
            if (expiryValue.includes('-') && expiryValue.length === 10) {
              const [year, month, day] = expiryValue.split('-').map(Number)
              expiryDate = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
            }
            // Handle DD/MM/YYYY format (already in correct format)
            else if (expiryValue.includes('/')) {
              expiryDate = expiryValue
            }
            // Handle other string formats
            else {
              expiryDate = expiryValue
            }
          }
        }

        console.log("Formatted expiry date:", expiryDate); // Debug log

        const promoCard = {
          id: `promo-${rowIndex}`,
          code:
            codeIndex !== -1 && row.c && row.c[codeIndex] && row.c[codeIndex].v
              ? String(row.c[codeIndex].v)
              : "PROMO",
          discount:
            discountIndex !== -1 && row.c && row.c[discountIndex] && row.c[discountIndex].v
              ? String(row.c[discountIndex].v)
              : "0",
          description:
            descriptionIndex !== -1 && row.c && row.c[descriptionIndex] && row.c[descriptionIndex].v
              ? String(row.c[descriptionIndex].v)
              : "",
          expiry: expiryDate || 'No expiry set', // Use formatted date or fallback
        }
        return promoCard
      })

    console.log("Fetched promo cards with expiry:", promoCardsData)
    setPromoCards(promoCardsData)
    setLoadingPromoCards(false)
  } catch (error) {
    console.error("Error fetching promo cards:", error)
    setPromoCards([])
    setLoadingPromoCards(false)
  }
}

  const testMaytapiConnection = async () => {
    try {
      const maytapiConfig = {
        productId: "930d3e45-c2bc-4a0f-b281-7d7827de10ff",
        token: "c4bb6257-cf31-40f4-9138-ac275c592fdb",
        phoneId: "97203",
        baseUrl: "https://api.maytapi.com/api/930d3e45-c2bc-4a0f-b281-7d7827de10ff",
      }
  
      const response = await fetch(`${maytapiConfig.baseUrl}/${maytapiConfig.phoneId}/status`, {
        method: "GET",
        headers: {
          "x-maytapi-key": maytapiConfig.token,
        },
      })
  
      const result = await response.json()
      console.log("Maytapi Status:", result)
      
      return result
    } catch (error) {
      console.error("Maytapi connection test failed:", error)
      return { error: error.message }
    }
  }

  // Function to send WhatsApp message via Maytapi
  const sendWhatsAppMessage = async (phoneNumber, message, customerName, imageUrl = null) => {
    try {
      const maytapiConfig = {
        productId: "930d3e45-c2bc-4a0f-b281-7d7827de10ff",
        token: "c4bb6257-cf31-40f4-9138-ac275c592fdb",
        phoneId: "97203",
        baseUrl: "https://api.maytapi.com/api/930d3e45-c2bc-4a0f-b281-7d7827de10ff",
      }
  
      // Clean phone number (remove any non-digits except +)
      let cleanPhone = phoneNumber.toString().replace(/[^\d+]/g, "")
      
      // Remove any leading zeros after country code
      if (cleanPhone.startsWith("+91")) {
        cleanPhone = "+91" + cleanPhone.substring(3).replace(/^0+/, "")
      } else if (!cleanPhone.startsWith("+")) {
        cleanPhone = "+91" + cleanPhone.replace(/^0+/, "")
      }
  
      console.log(`Attempting to send message to ${customerName} at ${cleanPhone}`)
  
      let payload;
      if (imageUrl && imageUrl.trim() !== "") {
        // Send image with caption
        payload = {
          to_number: cleanPhone,
          type: "media",
          message: imageUrl,
          text: message
        }
      } else {
        // Send text only
        payload = {
          to_number: cleanPhone,
          type: "text",
          message: message
        }
      }
  
      console.log("Payload:", JSON.stringify(payload, null, 2))
  
      const response = await fetch(`${maytapiConfig.baseUrl}/${maytapiConfig.phoneId}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-maytapi-key": maytapiConfig.token,
        },
        body: JSON.stringify(payload),
      })
  
      const result = await response.json()
      console.log(`API Response for ${customerName}:`, result)
  
      if (response.ok && result.success !== false) {
        console.log(`✅ Message sent successfully to ${customerName} (${cleanPhone})`)
        return { success: true, result }
      } else {
        console.error(`❌ Failed to send message to ${customerName}:`, result)
        return { success: false, error: result.message || 'Unknown error' }
      }
    } catch (error) {
      console.error(`💥 Error sending message to ${customerName}:`, error)
      return { success: false, error: error.message }
    }
  }
  
  

  // Function to replace template variables with customer data
  const replaceTemplateVariables = (template, customer) => {
  if (!template || typeof template !== 'string') {
    return template || ''
  }

  let message = template

  // Find the relevant headers for customer data
  const nameHeader = tableHeaders.find(
    (h) => h.label.toLowerCase().includes("customer") || h.label.toLowerCase().includes("name"),
  )
  const mobileHeader = tableHeaders.find(
    (h) => h.label.toLowerCase().includes("mobile") || h.label.toLowerCase().includes("phone"),
  )
  const addressHeader = tableHeaders.find((h) => h.label.toLowerCase().includes("address"))
  const emailHeader = tableHeaders.find((h) => h.label.toLowerCase().includes("email"))

  // Replace variables with actual customer data (only once)
  if (nameHeader && customer[nameHeader.id]) {
    const nameValue = String(customer[nameHeader.id]).trim()
    message = message.replace(/{name}/gi, nameValue)
  }
  if (mobileHeader && customer[mobileHeader.id]) {
    const phoneValue = String(customer[mobileHeader.id]).trim()
    message = message.replace(/{phone}/gi, phoneValue)
  }
  if (addressHeader && customer[addressHeader.id]) {
    const addressValue = String(customer[addressHeader.id]).trim()
    message = message.replace(/{address}/gi, addressValue)
  }
  if (emailHeader && customer[emailHeader.id]) {
    const emailValue = String(customer[emailHeader.id]).trim()
    message = message.replace(/{email}/gi, emailValue)
  }

  return message
}

  // Filter customers by search term
  const filteredCustomers = customerList.filter((customer) => {
    for (const key in customer) {
      if (customer[key] && String(customer[key]).toLowerCase().includes(searchTerm.toLowerCase())) {
        return true
      }
    }
    return false
  })

  // Handle input change for new customer form
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewCustomer({
      ...newCustomer,
      [name]: value,
    })
  }

  // Handle clicking "Add Customer" button
  const handleAddCustomer = async (e) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Create a full array of data for all columns, including the hidden delete column
      const fullRowData = []

      // Loop through all possible column indexes and add data in the correct positions
      const maxColumnIndex = Math.max(...tableHeaders.map((h) => h.originalIndex)) + 1

      for (let i = 0; i < maxColumnIndex + 1; i++) {
        // Find the header for this column index (if it exists in our filtered headers)
        const header = tableHeaders.find((h) => h.originalIndex === i)

        if (header) {
          // If we have this header in our UI, use the value from the form
          fullRowData[i] = newCustomer[header.id] || ""
        } else {
          // Any other hidden column gets an empty string
          // For delete column, set it to "No" for new customer
          fullRowData[i] = i === maxColumnIndex ? "No" : ""
        }
      }

      const formData = new FormData()
      formData.append("sheetName", sheetName)
      formData.append("rowData", JSON.stringify(fullRowData))
      formData.append("action", "insert")

      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      })

      console.log("Form submitted successfully")

      const newCustomerWithId = {
        ...newCustomer,
        _id: Math.random().toString(36).substring(2, 15),
        _status: "Active", // Default to active for new customers
        _daysSinceLastVisit: 0, // New customer just visited
      }

      setCustomerList((prev) => [newCustomerWithId, ...prev])

      setShowAddForm(false)

      // Reset form
      const emptyCustomer = {}
      tableHeaders.forEach((header) => {
        emptyCustomer[header.id] = ""
      })

      setNewCustomer(emptyCustomer)

      setNotification({
        show: true,
        message: "Customer added successfully!",
        type: "success",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
    } catch (error) {
      console.error("Error submitting new customer:", error)

      setNotification({
        show: true,
        message: `Failed to add customer: ${error.message}`,
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 5000)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle clicking "Add Customer" button to open modal
  const handleAddCustomerClick = () => {
    const emptyCustomer = {}
    tableHeaders.forEach((header) => {
      emptyCustomer[header.id] = ""
    })

    // Auto-fill timestamp
    const timestampHeader = tableHeaders.find(
      (header) => header.label.toLowerCase().includes("timestamp") || header.label.toLowerCase().includes("date"),
    )

    if (timestampHeader) {
      const today = new Date()
      const day = today.getDate().toString().padStart(2, "0")
      const month = (today.getMonth() + 1).toString().padStart(2, "0")
      const year = today.getFullYear()
      emptyCustomer[timestampHeader.id] = `${day}/${month}/${year}`
    }

    // Generate customer ID
    const idHeader = tableHeaders.find(
      (header) => header.label.toLowerCase().includes("customer id") || header.label.toLowerCase().includes("id"),
    )

    if (idHeader) {
      const customerIds = customerList
        .map((customer) => customer[idHeader.id])
        .filter((id) => id && typeof id === "string")

      let maxNumber = 0
      customerIds.forEach((id) => {
        const match = id.match(/CUS-(\d+)/)
        if (match) {
          const num = Number.parseInt(match[1], 10)
          if (num > maxNumber) maxNumber = num
        }
      })

      emptyCustomer[idHeader.id] = `CUS-${(maxNumber + 1).toString().padStart(3, "0")}`
    }

    setNewCustomer(emptyCustomer)
    setShowAddForm(true)
  }

  // Handle editing a customer
  const handleEditCustomer = (customer) => {
    setEditingCustomerId(customer._id)
    setNewCustomer({ ...customer })
    setShowEditForm(true)
  }

  // Handle updating a customer
  const handleUpdateCustomer = async (e) => {
    if (e) e.preventDefault()
    setSubmitting(true)

    try {
      const rowIndex = newCustomer._rowIndex

      if (!rowIndex) {
        throw new Error("Could not determine the row index for updating this customer")
      }

      // Create a full array of data for all columns, including the hidden delete column
      const fullRowData = []

      // Loop through all possible column indexes and add data in the correct positions
      const maxColumnIndex = Math.max(...tableHeaders.map((h) => h.originalIndex)) + 1

      for (let i = 0; i < maxColumnIndex + 1; i++) {
        // Find the header for this column index (if it exists in our filtered headers)
        const header = tableHeaders.find((h) => h.originalIndex === i)

        if (header) {
          // If we have this header in our UI, use the value from the form
          fullRowData[i] = newCustomer[header.id] || ""
        } else {
          // Any other hidden column gets an empty string
          // For delete column, keep it as "No" during update
          fullRowData[i] = i === maxColumnIndex ? "No" : ""
        }
      }

      const formData = new FormData()
      formData.append("sheetName", sheetName)
      formData.append("rowData", JSON.stringify(fullRowData))
      formData.append("rowIndex", rowIndex)
      formData.append("action", "update")

      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      })

      console.log("Update submitted successfully")

      // Recalculate status and days since last visit for the updated customer
      const updatedCustomer = { ...newCustomer }

      // Find column F header (attendance date)
      const dateHeaderF = tableHeaders.find((h) => h.originalIndex === 5)

      if (dateHeaderF && updatedCustomer[dateHeaderF.id]) {
        // Parse the date from DD/MM/YYYY format
        const dateParts = updatedCustomer[dateHeaderF.id].split("/")
        if (dateParts.length === 3) {
          const lastAttendanceDate = new Date(
            Number.parseInt(dateParts[2]), // Year
            Number.parseInt(dateParts[1]) - 1, // Month (0-indexed)
            Number.parseInt(dateParts[0]), // Day
          )

          // Get date from 2 months ago
          const twoMonthsAgo = new Date()
          twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2)

          // Compare dates to determine status
          updatedCustomer._status = lastAttendanceDate >= twoMonthsAgo ? "Active" : "Inactive"

          // Calculate days since last visit
          const today = new Date()
          const timeDiff = today.getTime() - lastAttendanceDate.getTime()
          updatedCustomer._daysSinceLastVisit = Math.floor(timeDiff / (1000 * 3600 * 24))
        }
      }

      setCustomerList((prev) =>
        prev.map((customer) => (customer._id === updatedCustomer._id ? updatedCustomer : customer)),
      )

      setEditingCustomerId(null)
      setShowEditForm(false)

      setNotification({
        show: true,
        message: "Customer updated successfully!",
        type: "success",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
    } catch (error) {
      console.error("Error updating customer:", error)

      setNotification({
        show: true,
        message: `Failed to update customer: ${error.message}`,
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 5000)
    } finally {
      setSubmitting(false)
    }
  }

  // Handle initiating delete confirmation
  const handleDeleteClick = (customer) => {
    setCustomerToDelete(customer)
    setShowDeleteModal(true)
  }

  // Handle confirming and soft-deleting a customer by marking delete column as "Yes"
  const confirmDelete = async () => {
    try {
      setSubmitting(true)
      const customer = customerToDelete
      const rowIndex = customer._rowIndex

      if (!rowIndex) {
        throw new Error("Could not determine the row index for marking this customer as deleted")
      }

      // Find the delete column index
      const deleteColumnIndex = Math.max(...tableHeaders.map((h) => h.originalIndex)) + 1

      const formData = new FormData()
      formData.append("sheetName", sheetName)
      formData.append("rowIndex", rowIndex)
      formData.append("action", "markDeleted")
      formData.append("columnIndex", deleteColumnIndex + 1) // +1 because Google Sheets is 1-indexed
      formData.append("value", "Yes")

      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      })

      console.log("Mark as deleted submitted successfully")

      // Update customer list state - remove from UI
      setCustomerList((prev) => prev.filter((c) => c._id !== customer._id))

      setNotification({
        show: true,
        message: "Customer removed successfully!",
        type: "success",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
    } catch (error) {
      console.error("Error marking customer as deleted:", error)

      setNotification({
        show: true,
        message: `Failed to remove customer: ${error.message}`,
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 5000)
    } finally {
      setSubmitting(false)
      setShowDeleteModal(false)
      setCustomerToDelete(null)
    }
  }

  // Enhanced Google Drive URL converter with multiple formats
const convertGoogleDriveImageUrl = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") {
    return null;
  }

  // If it's not a Google Drive URL, return as is
  if (!originalUrl.includes("drive.google.com")) {
    return originalUrl;
  }

  // Extract file ID from various Google Drive URL formats
  const fileIdMatch = originalUrl.match(/\/d\/([^/]+)|id=([^&]+)/);
  const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] : null;

  if (!fileId) return originalUrl;

  // Return an array of possible URLs to try
  return [
    // Direct Google Drive CDN URLs
    `https://lh3.googleusercontent.com/d/${fileId}`,
    // Export view URLs (more likely to work with permissions)
    `https://drive.google.com/uc?export=view&id=${fileId}`,
    // Thumbnail URLs (often work even with limited permissions)
    `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`,
    // Alternative format
    `https://drive.google.com/uc?id=${fileId}`,
    // Original URL as fallback
    originalUrl,
  ];
};

// Component for images with fallback handling
// Component for images with fallback handling
const ImgWithFallback = ({ src, alt, name, className }) => {
  const [imgSrc, setImgSrc] = useState(src);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  // Reset when src changes
  useEffect(() => {
    setImgSrc(src);
    setLoadFailed(false);
    setAttemptCount(0);
  }, [src]);

  // Handle image load errors with multiple fallback attempts
  const handleError = () => {
    console.log(`Image load failed for attempt ${attemptCount + 1}:`, imgSrc);
    
    if (attemptCount === 0 && imgSrc === src) {
      // First failure - try alternative Google Drive formats
      if (imgSrc && imgSrc.includes("drive.google.com")) {
        let fileId = null;
        const match = imgSrc.match(/\/d\/([^/&=]+)|id=([^&=]+)/);
        fileId = match ? match[1] || match[2] : null;

        if (fileId) {
          // Try the thumbnail format
          const newSrc = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
          console.log("Trying thumbnail format:", newSrc);
          setImgSrc(newSrc);
          setAttemptCount(1);
          return;
        }
      }
    } else if (attemptCount === 1) {
      // Second failure - try another format
      if (imgSrc && imgSrc.includes("drive.google.com")) {
        let fileId = null;
        const match = imgSrc.match(/\/d\/([^/&=]+)|id=([^&=]+)/);
        fileId = match ? match[1] || match[2] : null;

        if (fileId) {
          // Try the uc format without export=download
          const newSrc = `https://drive.google.com/uc?id=${fileId}`;
          console.log("Trying uc format:", newSrc);
          setImgSrc(newSrc);
          setAttemptCount(2);
          return;
        }
      }
    } else if (attemptCount === 2) {
      // Third failure - try lh3.googleusercontent format
      if (imgSrc && imgSrc.includes("drive.google.com")) {
        let fileId = null;
        const match = imgSrc.match(/\/d\/([^/&=]+)|id=([^&=]+)/);
        fileId = match ? match[1] || match[2] : null;

        if (fileId) {
          const newSrc = `https://lh3.googleusercontent.com/d/${fileId}`;
          console.log("Trying lh3 format:", newSrc);
          setImgSrc(newSrc);
          setAttemptCount(3);
          return;
        }
      }
    }
    
    // All attempts failed - show fallback
    console.log("All image load attempts failed, showing fallback");
    setLoadFailed(true);
  };

  // If all image loading attempts failed, show a fallback with initials
  if (loadFailed) {
    // Extract initials from name
    const initials = name
      ? name
          .split(" ")
          .map((part) => part.charAt(0))
          .join("")
          .toUpperCase()
          .substring(0, 2)
      : "IMG";

    // Return a styled div with initials
    return (
      <div className={`${className} bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center`}>
        <span className="text-white text-lg font-bold">{initials}</span>
      </div>
    );
  }

  // Return the image with error handling
  return (
    <img
      src={imgSrc || "/placeholder.svg"}
      alt={alt}
      className={`${className} object-cover`}
      onError={handleError}
      style={{ objectFit: "cover", width: "100%", height: "100%" }}
      onLoad={() => console.log("Image loaded successfully:", imgSrc)}
    />
  );
};

  // Handle canceling delete
  const cancelDelete = () => {
    setShowDeleteModal(false)
    setCustomerToDelete(null)
  }

  // Handle checkbox selection
  const handleSelectCustomer = (customerId) => {
    setSelectedCustomers((prev) => {
      if (prev.includes(customerId)) {
        return prev.filter((id) => id !== customerId)
      } else {
        return [...prev, customerId]
      }
    })
  }

  // Handle select all checkbox
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCustomers(filteredCustomers.map((customer) => customer._id))
    } else {
      setSelectedCustomers([])
    }
  }

  // Replace the handleSendMessageClick function with this:
  const handleSendMessageClick = async () => {
    // Always show the modal regardless of selection
    setMessageType("active")
    setSelectedPromoCard(null)
    setShowSendMessageModal(true)
  }

  // Remove the handleDirectSubmit function entirely since we don't need it anymore

  // Handle template selection
  const handleTemplateChange = (e) => {
    const templateId = e.target.value              // Get selected template ID from dropdown
    setSelectedTemplate(templateId)                // Update state with selected template
    
    if (templateId) {
      const template = templates.find((t) => t.id === templateId)  // Find the template object
      if (template) {
        let message = template.message              // Get the template message
        
        // If exactly one customer is selected, personalize the message
        if (selectedCustomers.length === 1) {
          const customer = filteredCustomers.find((c) => c._id === selectedCustomers[0])
          
          // Find the column that contains customer names
          const nameHeader = tableHeaders.find(
            (header) => header.label.toLowerCase().includes("customer") || 
                       header.label.toLowerCase().includes("name")
          )
          
          // Replace {name} placeholder with actual customer name
          if (nameHeader && customer && customer[nameHeader.id]) {
            message = message.replace(/{name}/g, customer[nameHeader.id])
          }
        }
        
        setCustomMessage(message)                   // Update the message textarea
      }
    } else {
      setCustomMessage("")                          // Clear message if no template selected
    }
  }

  // Replace the Send Message Modal with this updated version
  const SendMessageModalContent = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <MessageSquare className="text-green-600 mr-3" size={24} />
              <h3 className="text-xl font-bold text-gray-900">Send Message</h3>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowSendMessageModal(false)}>
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-gray-600">Send a message to all {messageType} customers</p>
            {selectedCustomers.length > 0 && (
              <div className="mb-4 p-3 bg-blue-50 rounded-md">
                <p className="text-blue-800 font-medium">
                  {selectedCustomers.length} customer{selectedCustomers.length > 1 ? "s" : ""} selected
                </p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="customerType" className="block text-sm font-medium text-gray-700 mb-1">
                Customer Type
              </label>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-purple-600"
                    name="customerType"
                    value="active"
                    checked={messageType === "active"}
                    onChange={() => setMessageType("active")}
                  />
                  <span className="ml-2">Active Customers</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio text-purple-600"
                    name="customerType"
                    value="inactive"
                    checked={messageType === "inactive"}
                    onChange={() => setMessageType("inactive")}
                  />
                  <span className="ml-2">Inactive Customers</span>
                </label>
              </div>
            </div>

            <div>
              <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-1">
                Select Template
              </label>
              {templates.length > 0 ? (
                <select
                  id="template"
                  className="w-full p-2 border rounded-md"
                  value={selectedTemplate}
                  onChange={handleTemplateChange}
                >
                  <option value="">Select a template</option>
                  {filteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500 p-2 border border-dashed rounded-md border-gray-300">
                  No {messageType} templates available.
                </div>
              )}
{selectedTemplate && (
  <div className="mt-2 p-3 bg-gray-50 rounded-md">
    <h5 className="text-sm font-medium text-gray-700 mb-2">Template Preview:</h5>
    <p className="text-sm text-gray-600 whitespace-pre-line mb-2">
      {templates.find((t) => t.id === selectedTemplate)?.message || ""}
    </p>
    {(() => {
      const selectedTemplateData = templates.find((t) => t.id === selectedTemplate);
      const imageUrl = selectedTemplateData?.imageUrl;
      
      if (imageUrl && imageUrl.trim() !== "") {
        return (
          <div className="mt-2">
            <div className="flex items-center mb-2">
              <ImageIcon className="text-blue-600 mr-2" size={16} />
              <span className="text-sm font-medium text-gray-700">Image Preview:</span>
            </div>
            <div className="relative" style={{ minHeight: '150px' }}>
              <ImgWithFallback 
                src={imageUrl}
                alt="Template Image"
                name={selectedTemplateData.name}
                className="max-w-full h-auto max-h-32 rounded border"
              />
            </div>
          </div>
        );
      }
      return null;
    })()}
  </div>
)}

            </div>

            <div>
  <label htmlFor="promoCard" className="block text-sm font-medium text-gray-700 mb-1">
    Include Promo Card (Optional)
  </label>
  {loadingPromoCards ? (
    <div className="flex items-center space-x-2">
      <div className="h-4 w-4 border-t-2 border-b-2 border-purple-500 rounded-full animate-spin"></div>
      <span className="text-sm text-gray-500">Loading promo cards...</span>
    </div>
  ) : promoCards.length > 0 ? (
    <select
      id="promoCard"
      className="w-full p-2 border rounded-md"
      value={selectedPromoCard ? selectedPromoCard.id : ""}
      onChange={(e) => {
        const selected = promoCards.find((card) => card.id === e.target.value)
        setSelectedPromoCard(selected || null)
      }}
    >
      <option value="">No promo card</option>
      {promoCards.map((card) => (
        <option key={card.id} value={card.id}>
          {card.code} - {card.discount}% off (Valid until: {card.expiry || 'N/A'})
        </option>
      ))}
    </select>
  ) : (
    <div className="text-sm text-gray-500 p-2 border border-dashed rounded-md border-gray-300">
      No valid promo cards available.
    </div>
  )}
  
  {/* Show selected promo card details */}
  {selectedPromoCard && (
    <div className="mt-2 p-3 bg-blue-50 rounded-md">
      <h5 className="text-sm font-medium text-blue-700 mb-1">Selected Promo Details:</h5>
      <p className="text-sm text-blue-600">
        Code: <strong>{selectedPromoCard.code}</strong><br/>
        Discount: <strong>{selectedPromoCard.discount}% OFF</strong><br/>
        Valid Until: <strong>{selectedPromoCard.expiry || 'Limited Time'}</strong>
      </p>
    </div>
  )}
</div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Message
              </label>
              <textarea
                id="message"
                rows={6}
                className="w-full p-2 border rounded-md"
                placeholder="Enter your message here..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
              ></textarea>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 mt-4 border-t border-gray-200">
            <button
              type="button"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              onClick={() => setShowSendMessageModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendMessage}
              className="px-4 py-2 bg-green-600 text-white rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
            >
              {submitting ? (
                <>
                  <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // Update the handleSendMessage function to include the template message
  const handleSendMessage = async () => {
    // Prevent multiple simultaneous submissions
    if (submitting) {
      console.log("Already submitting, skipping...")
      return
    }
  
    // Get customers based on selection
    let customers = []
  
    if (selectedCustomers.length > 0) {
      customers = filteredCustomers.filter((customer) => selectedCustomers.includes(customer._id))
    } else {
      customers = filteredCustomers.filter((customer) =>
        messageType === "active" ? customer._status === "Active" : customer._status === "Inactive",
      )
    }
  
    if (customers.length === 0) {
      setNotification({
        show: true,
        message: `No customers found to send messages to!`,
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
      return
    }
  
    // Check if template is selected
    if (!selectedTemplate) {
      setNotification({
        show: true,
        message: "Please select a template!",
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
      return
    }
  
    // Find the selected template
    const template = templates.find((t) => t.id === selectedTemplate)
    if (!template) {
      setNotification({
        show: true,
        message: "Selected template not found!",
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
      return
    }
  
    // Find the mobile and name headers
    const mobileHeader = tableHeaders.find(
      (header) => header.label.toLowerCase().includes("mobile") || header.label.toLowerCase().includes("phone"),
    )
    const nameHeader = tableHeaders.find(
      (header) => header.label.toLowerCase().includes("customer") || header.label.toLowerCase().includes("name"),
    )
  
    if (!mobileHeader || !nameHeader) {
      setNotification({
        show: true,
        message: "Required columns (name/mobile) not found!",
        type: "error",
      })
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
      return
    }
  
    try {
      setSubmitting(true)
      let successCount = 0
      let failureCount = 0
      let sheetSubmissions = 0
  
      console.log(`📤 Starting to process ${customers.length} customers...`)
  
      // Prepare timestamp
      const today = new Date()
      const day = today.getDate().toString().padStart(2, "0")
      const month = (today.getMonth() + 1).toString().padStart(2, "0")
      const year = today.getFullYear()
      const timestamp = `${day}/${month}/${year}`
  
      // Process each customer with better error handling
      for (let i = 0; i < customers.length; i++) {
        const customer = customers[i]
        const customerName = customer[nameHeader.id] || "N/A"
        const mobileNumber = customer[mobileHeader.id] || "N/A"
  
        console.log(`Processing ${i + 1}/${customers.length}: ${customerName}`)
  
        if (mobileNumber === "N/A" || !mobileNumber) {
          console.log(`⚠️ Skipping ${customerName} - no mobile number`)
          failureCount++
          continue
        }
  
        try {
          // Prepare message with promo card details if selected
          let finalMessage = replaceTemplateVariables(template.message, customer)
          
          // Add promo card details if selected
          if (selectedPromoCard) {
            const promoText = `\n\n🎉 Special Offer for You!\nPromo Code: ${selectedPromoCard.code}\nDiscount: ${selectedPromoCard.discount}% OFF\nValid Until: ${selectedPromoCard.expiry || 'Limited Time'}\n\nUse this code to avail the discount!`
            finalMessage += promoText
          }
  
          // 1. Submit to Google Sheet first
          const rowData = [
            timestamp,
            customerName,
            mobileNumber,
            `${template.name} - ${customerName}`,
            finalMessage, // Use the final message with promo details
          ]
  
          const formData = new FormData()
          formData.append("sheetName", "Send Message")
          formData.append("rowData", JSON.stringify(rowData))
          formData.append("action", "insert")
  
          // Submit to sheet with timeout
          const sheetPromise = fetch(scriptUrl, {
            method: "POST",
            mode: "no-cors",
            body: formData,
          })
  
          await Promise.race([
            sheetPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Sheet timeout')), 10000))
          ])
  
          sheetSubmissions++
          console.log(`📊 Sheet submission successful for ${customerName}`)
  
          // 2. Send WhatsApp message
          const imageUrl = template.imageUrl && template.imageUrl.trim() !== "" ? template.imageUrl : null
  
          const result = await sendWhatsAppMessage(mobileNumber, finalMessage, customerName, imageUrl)
  
          if (result.success) {
            successCount++
            console.log(`✅ WhatsApp sent successfully to ${customerName}`)
          } else {
            failureCount++
            console.log(`❌ WhatsApp failed for ${customerName}:`, result.error)
          }
  
          // Add delay between messages to avoid rate limiting
          if (i < customers.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000))
          }
  
        } catch (error) {
          console.error(`💥 Error processing ${customerName}:`, error)
          failureCount++
        }
      }
  
      // Show detailed results
      console.log(`📋 Final Results: Sheet submissions: ${sheetSubmissions}, WhatsApp success: ${successCount}, Failures: ${failureCount}`)
  
      setNotification({
        show: true,
        message: `Processed ${customers.length} customers! Sheet: ${sheetSubmissions} saved, WhatsApp: ${successCount} sent, Failed: ${failureCount}`,
        type: successCount > 0 ? "success" : "error",
      })
  
      // Clear selected customers if messages were processed successfully
      if (successCount > 0) {
        setSelectedCustomers([])
      }
  
    } catch (error) {
      console.error("💥 Error in handleSendMessage:", error)
      setNotification({
        show: true,
        message: `Failed to process messages: ${error.message}`,
        type: "error",
      })
    } finally {
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 8000) // Longer timeout for detailed message
      setSubmitting(false)
      setShowSendMessageModal(false)
      setSelectedTemplate("")
      setCustomMessage("")
    }
  }

  // Replace the Send Message Modal in the return statement
  // Find and replace the existing Send Message Modal with this:
  const filteredTemplates = templates.filter((template) => template.type === messageType)

  const getColumnName = (header) => {
    // Check if header is null or undefined
    if (!header || !header.label) {
      return "Unknown Column"
    }

    // Split the label into words and capitalize the first letter of each word
    const words = header.label.split(" ")
    const capitalizedWords = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1))

    // Join the capitalized words back into a string
    return capitalizedWords.join(" ")
  }

  const renderFormField = (header, isEdit = false) => {
    const inputId = isEdit ? `edit-${header.id}` : header.id
    const value = newCustomer[header.id] || ""

    if (header.type === "number") {
      return (
        <input
          type="number"
          id={inputId}
          name={header.id}
          value={value}
          onChange={handleInputChange}
          className="w-full pl-3 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      )
    }

    if (header.type === "boolean") {
      return (
        <select
          id={inputId}
          name={header.id}
          value={value}
          onChange={handleInputChange}
          className="w-full pl-3 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      )
    }

    // Add date type
    if (header.type === "date") {
      return (
        <input
          type="date"
          id={inputId}
          name={header.id}
          value={value}
          onChange={handleInputChange}
          className="w-full pl-3 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      )
    }

    return (
      <input
        type="text"
        id={inputId}
        name={header.id}
        value={value}
        onChange={handleInputChange}
        className="w-full pl-3 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
      />
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Customer Database</h2>

      {/* Stats Card */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold mb-2">Total Customers</h3>
            <p className="text-4xl font-bold">{customerList.length}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-4 rounded-full">
            <img
              src="https://cdn-icons-png.flaticon.com/512/3050/3050525.png"
              alt="Salon Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
        </div>
      </div>

      {/* Search and Add Bar */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search customers..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>

        <div className="flex gap-2">
          {/* Update the button text logic in the Search and Add Bar section: */}
          {/* Change the button to always show "Send Message" instead of conditional text */}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors duration-300"
            onClick={handleSendMessageClick}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <MessageSquare size={18} />
                <span>Send Message</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-purple-600">Loading customer data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
            {error}{" "}
            <button className="underline ml-2" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  {/* Checkbox Column */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      onChange={handleSelectAll}
                      checked={selectedCustomers.length > 0 && selectedCustomers.length === filteredCustomers.length}
                    />
                  </th>

                  {/* Customer Name Column (First) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer Name
                  </th>

                  {/* Mobile Number Column (Second) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mobile Number
                  </th>

                  {/* Last Visit Column (Third) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Visit
                  </th>

                  {/* Other Column (Fourth) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {filteredHeaders.length > 3 ? getColumnName(filteredHeaders[3]) : "Notes"}
                  </th>

                  {/* Days Since Visit Column (Fifth - New) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Since Visit
                  </th>

                  {/* Status Column (Sixth) */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map((customer) => (
                    <tr key={customer._id}>
                      {/* Checkbox Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                          checked={selectedCustomers.includes(customer._id)}
                          onChange={() => handleSelectCustomer(customer._id)}
                        />
                      </td>

                      {/* Customer Name Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <User className="text-purple-600" size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {customer[filteredHeaders[0]?.id] || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Mobile Number Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{customer[filteredHeaders[1]?.id] || "N/A"}</div>
                      </td>

                      {/* Last Visit Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {customer[filteredHeaders[2]?.id] || "No visit recorded"}
                        </div>
                      </td>

                      {/* Other Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {filteredHeaders.length > 3 ? customer[filteredHeaders[3]?.id] || "N/A" : "N/A"}
                        </div>
                      </td>

                      {/* Days Since Visit Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="text-purple-600 mr-2" size={16} />
                          <span
                            className={`text-sm font-medium ${
                              customer._daysSinceLastVisit === "N/A"
                                ? "text-gray-500"
                                : Number.parseInt(customer._daysSinceLastVisit) > 60
                                  ? "text-red-600"
                                  : Number.parseInt(customer._daysSinceLastVisit) > 30
                                    ? "text-yellow-600"
                                    : "text-green-600"
                            }`}
                          >
                            {customer._daysSinceLastVisit === "N/A"
                              ? "No data"
                              : `${customer._daysSinceLastVisit} days`}
                          </span>
                        </div>
                      </td>

                      {/* Status Column */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            customer._status === "Active"
                              ? "bg-green-100 text-green-800"
                              : customer._status === "Inactive"
                                ? "bg-red-100 text-red-800"
                                : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {customer._status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No customers found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for adding new customer */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-purple-800">Add New Customer</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowAddForm(false)}>
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tableHeaders.map((header) => (
                    <div key={header.id}>
                      <label htmlFor={header.id} className="block text-sm font-medium text-purple-700">
                        {getColumnName(header)}
                      </label>
                      {renderFormField(header)}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-purple-100">
                  <button
                    type="button"
                    className="px-4 py-2 border border-purple-300 rounded-md shadow-sm text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onClick={() => setShowAddForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Save Customer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing customer */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-purple-800">Edit Customer</h3>
                <button
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingCustomerId(null)
                  }}
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleUpdateCustomer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {tableHeaders.map((header) => (
                    <div key={`edit-${header.id}`}>
                      <label htmlFor={`edit-${header.id}`} className="block text-sm font-medium text-purple-700">
                        {getColumnName(header)}
                      </label>
                      {renderFormField(header, true)}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-purple-100">
                  <button
                    type="button"
                    className="px-4 py-2 border border-purple-300 rounded-md shadow-sm text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onClick={() => {
                      setShowEditForm(false)
                      setEditingCustomerId(null)
                    }}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={18} className="mr-2" />
                        Update Customer
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 p-2 rounded-full mr-3">
                  <Trash2 className="text-red-600" size={24} />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Deletion</h3>
              </div>

              <p className="text-gray-600 mb-6">
                Are you sure you want to remove this customer? This action cannot be undone.
                {customerToDelete && (
                  <span className="font-medium block mt-2">
                    Customer Name:{" "}
                    {customerToDelete[tableHeaders.find((h) => h.label.toLowerCase().includes("name"))?.id]}
                  </span>
                )}
              </p>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  onClick={cancelDelete}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} className="mr-2" />
                      Delete Customer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Message Modal */}
      {showSendMessageModal && <SendMessageModalContent />}

      {/* Notification popup */}
      {notification.show && (
        <div
          className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 ${
            notification.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          <p className="font-medium">{notification.message}</p>
        </div>
      )}
    </div>
  )
}

export default CustomerDb
  
