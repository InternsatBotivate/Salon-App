"use client"

import { useState, useEffect } from "react"
import { User, Search, Edit, Trash2, UserPlus, Save, X, Users, MessageSquare, Send, Calendar } from "lucide-react"
import { useAuth } from "./Context/AuthContext" // Import useAuth hook

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
  const { user } = useAuth()

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
  const sheetId = user?.sheetId || "1ghSQ9d2dfSotfnh8yrkiqIT00kg_ej7n0pnygzP0B9w"
  const scriptUrl =
    user?.appScriptUrl ||
    "https://script.google.com/macros/s/AKfycbx-5-79dRjYuTIBFjHTh3_Q8WQa0wWrRKm7ukq5854ET9OCHiAwno-gL1YmZ9juotMH/exec"
  const sheetName = "Booking DB"
  const templateSheetName = "Whatsapp Temp"

  // Fetch customer data from Google Sheet
  useEffect(() => {
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
        fetchWhatsAppTemplates()
        // Fetch promo cards
        fetchPromoCards()
      } catch (error) {
        console.error("Error fetching Google Sheet data:", error)
        setError("Failed to load customer data")
        setLoading(false)
      }
    }

    fetchGoogleSheetData()
  }, [])

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

      // Define column indexes
      const idIndex = 0 // Assuming column A is ID
      const nameIndex = 1 // Assuming column B is Template Name
      const typeIndex = 2 // Assuming column C is Type (active or inactive)
      const messageIndex = 3 // Assuming column D is Message
      const deletedIndex = 5 // Assuming column F is delete flag

      const templatesData = data.table.rows
        .filter((row) => {
          // Skip deleted templates
          const isDeleted =
            row.c && row.c.length > deletedIndex && row.c[deletedIndex] && row.c[deletedIndex].v === "Yes"
          return !isDeleted && row.c && row.c.some((cell) => cell && cell.v)
        })
        .map((row, rowIndex) => {
          const template = {
            id: row.c && row.c[idIndex] && row.c[idIndex].v ? String(row.c[idIndex].v) : `template-${rowIndex}`,
            name: row.c && row.c[nameIndex] && row.c[nameIndex].v ? String(row.c[nameIndex].v) : "Unnamed Template",
            type: row.c && row.c[typeIndex] && row.c[typeIndex].v ? String(row.c[typeIndex].v).toLowerCase() : "active",
            message: row.c && row.c[messageIndex] && row.c[messageIndex].v ? String(row.c[messageIndex].v) : "",
          }
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

  // Function to fetch promo cards
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

      // Define column indexes
      const codeIndex = data.table.cols.findIndex((col) => col.label && col.label.toLowerCase().includes("code"))
      const discountIndex = data.table.cols.findIndex(
        (col) => col.label && col.label.toLowerCase().includes("discount"),
      )
      const descriptionIndex = data.table.cols.findIndex(
        (col) => col.label && col.label.toLowerCase().includes("description"),
      )
      const deletedIndex = data.table.cols.findIndex((col) => col.label && col.label.toLowerCase().includes("delete"))
      const expiryIndex = data.table.cols.findIndex(
        (col) =>
          col.label && (col.label.toLowerCase().includes("expiry") || col.label.toLowerCase().includes("valid until")),
      )

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
            // Handle date values
            if (row.c[expiryIndex].v.toString().indexOf("Date") === 0) {
              const dateString = row.c[expiryIndex].v.toString()
              const dateParts = dateString.substring(5, dateString.length - 1).split(",")

              if (dateParts.length >= 3) {
                const year = Number.parseInt(dateParts[0])
                const month = Number.parseInt(dateParts[1]) // 0-indexed month
                const day = Number.parseInt(dateParts[2])

                const expiryDate = new Date(year, month, day)
                isExpired = today > expiryDate
              }
            } else if (typeof row.c[expiryIndex].v === "string") {
              // Try to parse DD/MM/YYYY format
              const dateParts = row.c[expiryIndex].v.split("/")
              if (dateParts.length === 3) {
                const day = Number.parseInt(dateParts[0])
                const month = Number.parseInt(dateParts[1]) - 1 // 0-indexed month
                const year = Number.parseInt(dateParts[2])

                const expiryDate = new Date(year, month, day)
                isExpired = today > expiryDate
              }
            }
          }

          return !isDeleted && !isExpired && row.c && row.c.some((cell) => cell && cell.v)
        })
        .map((row, rowIndex) => {
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
          }
          return promoCard
        })

      console.log("Fetched promo cards:", promoCardsData)
      setPromoCards(promoCardsData)
      setLoadingPromoCards(false)
    } catch (error) {
      console.error("Error fetching promo cards:", error)
      setPromoCards([])
      setLoadingPromoCards(false)
    }
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

  // Handle opening send message modal
  const handleSendMessageClick = () => {
    setMessageType("active")
    setSelectedPromoCard(null)
    setShowSendMessageModal(true)
  }

  // Handle template selection
  const handleTemplateChange = (e) => {
    const templateId = e.target.value
    setSelectedTemplate(templateId)

    if (templateId) {
      const template = templates.find((t) => t.id === templateId)
      if (template) {
        // Replace placeholders with customer data if a customer is selected
        let message = template.message

        if (selectedCustomers.length === 1) {
          const customer = filteredCustomers.find((c) => c._id === selectedCustomers[0])

          // Find the name header
          const nameHeader = tableHeaders.find(
            (header) => header.label.toLowerCase().includes("customer") || header.label.toLowerCase().includes("name"),
          )

          if (nameHeader && customer && customer[nameHeader.id]) {
            message = message.replace(/{name}/g, customer[nameHeader.id])
          }
        }

        setCustomMessage(message)
      }
    } else {
      setCustomMessage("")
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
            <p className="text-gray-600">
              Send a message to{" "}
              {selectedCustomers.length > 0
                ? `${selectedCustomers.length} selected customers`
                : `all ${messageType} customers`}
            </p>
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
                    disabled={selectedCustomers.length > 0}
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
                    disabled={selectedCustomers.length > 0}
                  />
                  <span className="ml-2">Inactive Customers</span>
                </label>
              </div>
              {selectedCustomers.length > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Customer type selection is disabled when specific customers are selected.
                </p>
              )}
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
                      {card.code} - {card.discount}% off
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-sm text-gray-500 p-2 border border-dashed rounded-md border-gray-300">
                  No valid promo cards available.
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
    // Get selected customers
    const customers = 
      selectedCustomers.length > 0 
        ? filteredCustomers.filter(customer => selectedCustomers.includes(customer._id))
        : filteredCustomers.filter(customer => 
            messageType === "active" ? customer._status === "Active" : customer._status === "Inactive"
          );
  
    if (customers.length === 0) {
      setNotification({
        show: true,
        message: "No customers selected for messaging!",
        type: "error"
      });
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
      return;
    }
  
    // Find the mobile and name headers
    const mobileHeader = tableHeaders.find(
      header => header.label.toLowerCase().includes("mobile") || header.label.toLowerCase().includes("phone")
    );
    const nameHeader = tableHeaders.find(
      header => header.label.toLowerCase().includes("customer") || header.label.toLowerCase().includes("name")
    );
  
    if (!mobileHeader || !nameHeader) {
      setNotification({
        show: true,
        message: "Required columns (name/mobile) not found!",
        type: "error"
      });
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
      return;
    }
  
    try {
      setSubmitting(true);
  
      // Prepare data to send to Google Sheets
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      const timestamp = `${day}/${month}/${year}`;
  
      // Process each customer one by one (since your script doesn't support batch)
      for (const customer of customers) {
        const customerName = customer[nameHeader.id] || "N/A";
        const mobileNumber = customer[mobileHeader.id] || "N/A";
        
        // Prepare the row data in the format your script expects
        const rowData = [
          timestamp,                // Column A: Timestamp
          customerName,            // Column B: Customer Name
          mobileNumber,            // Column C: Mobile Number
          customMessage,           // Column D: Message
          selectedPromoCard?.code || "",  // Column E: Promo Code (if any)
        ];
  
        const formData = new FormData();
        formData.append("sheetName", "Send Message");
        formData.append("rowData", JSON.stringify(rowData));
        formData.append("action", "insert");
  
        // Send data to Google Sheets
        const response = await fetch(scriptUrl, {
          method: "POST",
          body: formData
        });
  
        // Try to parse the response (even in no-cors mode)
        try {
          const result = await response.text();
          console.log(`Response for ${customerName}:`, result);
        } catch (error) {
          console.log(`Submitted data for ${customerName}`);
        }
      }
  
      // Show success notification
      setNotification({
        show: true,
        message: `Message data submitted for ${customers.length} customers!`,
        type: "success"
      });
  
    } catch (error) {
      console.error("Error submitting message data:", error);
      setNotification({
        show: true,
        message: `Failed to submit message data: ${error.message}`,
        type: "error"
      });
    } finally {
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
      setSubmitting(false);
      setShowSendMessageModal(false);
      setSelectedCustomers([]);
      setSelectedTemplate("");
      setCustomMessage("");
    }
  };

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
          {/* <button
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300"
            onClick={handleAddCustomerClick}
          >
            <UserPlus size={18} />
            <span>Add Customer</span>
          </button> */}
          <button
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-300"
            onClick={handleSendMessageClick}
          >
            <MessageSquare size={18} />
            <span>Send Message</span>
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

                  {/* Actions Column (Seventh) */}
                  {/* <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th> */}
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

                      {/* Actions Column */}
                      {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-purple-600 hover:text-purple-800 mr-3"
                          onClick={() => handleEditCustomer(customer)}
                        >
                          <Edit size={18} />
                        </button>
                        <button className="text-red-600 hover:text-red-800" onClick={() => handleDeleteClick(customer)}>
                          <Trash2 size={18} />
                        </button>
                      </td> */}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
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
