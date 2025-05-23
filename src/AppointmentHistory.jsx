"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, IndianRupee, TrendingUp, BarChart2, CreditCard, Scissors, History, X, Search, Edit, Save, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useAuth } from "./Context/AuthContext" // Import useAuth hook

const DailyEntry = ({ hideHistoryButton = false }) => {
  // Get user data from AuthContext
  const { user } = useAuth()
  
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tableHeaders, setTableHeaders] = useState([])
  const [transactions, setTransactions] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historySearchTerm, setHistorySearchTerm] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [stats, setStats] = useState({
    totalRevenue: 0,
    services: 0,
    cardPayments: 0,
    averageSale: 0
  })

  const [showDiscountForm, setShowDiscountForm] = useState(false);
  const [promoCards, setPromoCards] = useState([]);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [loadingPromos, setLoadingPromos] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Add state for edit functionality
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [serviceOptions, setServiceOptions] = useState([])
  const [extraServices, setExtraServices] = useState([])
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: ""
  })
  
  // Add state for selected extra services
  const [selectedExtraServices, setSelectedExtraServices] = useState([])

  // Google Sheet Details
  const sheetId = user?.sheetId || '1ghSQ9d2dfSotfnh8yrkiqIT00kg_ej7n0pnygzP0B9w';
  const scriptUrl = user?.appScriptUrl || 'https://script.google.com/macros/s/AKfycbx-5-79dRjYuTIBFjHTh3_Q8WQa0wWrRKm7ukq5854ET9OCHiAwno-gL1YmZ9juotMH/exec';
  const sheetName = 'Daily Entry'
  
  // Google Apps Script Web App URL

// Enhanced useEffect for fetching service data with better debugging
useEffect(() => {
  const fetchExtraServices = async () => {
    try {
      console.log("Fetching extra services...")
      
      // Create URL to fetch the Service DB sheet
      const serviceDBSheetName = 'Service DB'
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(serviceDBSheetName)}`
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch service data: ${response.status}`)
      }
      
      // Extract the JSON part from the response
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)
      
      // Process the rows to extract service info
      if (data.table && data.table.rows) {
        const services = data.table.rows
          .filter(row => row.c && row.c[2] && row.c[4]) // Ensure both name and price exist
          .map(row => {
            const name = row.c[2].v
            const price = parseFloat(row.c[4].v)
            return { name, price }
          })
          .filter(service => service.name && !isNaN(service.price))
        
        console.log("Loaded extra services:", services)
        setExtraServices(services)
      }
    } catch (error) {
      console.error("Error fetching extra services:", error)
    }
  }
  
  fetchExtraServices()
}, [sheetId]) // Only run when sheetId changes

// This is where you need to modify the fetchGoogleSheetData function
// Inside your useEffect hook that fetches Google Sheet data

// useEffect(() => {
//   const fetchGoogleSheetData = async () => {
//     try {
//       setLoading(true)
//       console.log("Starting to fetch Google Sheet data...")
//       console.log("Current user data:", user) // Debug: Log user data
      
//       // Create URL to fetch the sheet in JSON format (this method works for public sheets)
//       const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
//       console.log("Fetching from URL:", url)
      
//       const response = await fetch(url)
//       if (!response.ok) {
//         throw new Error(`Failed to fetch data: ${response.status}`)
//       }
      
//       // Extract the JSON part from the response (Google returns a weird format)
//       const text = await response.text()
//       // The response is like: google.visualization.Query.setResponse({...})
//       const jsonStart = text.indexOf('{')
//       const jsonEnd = text.lastIndexOf('}')
//       const jsonString = text.substring(jsonStart, jsonEnd + 1)
//       const data = JSON.parse(jsonString)
      
//       // Extract headers from cols
//       const headers = data.table.cols.map((col, index) => ({
//         id: `col${index}`,
//         label: col.label || col.id,
//         type: col.type
//       })).filter(header => header.label) // Filter out empty headers
      
//       setTableHeaders(headers)
      
//       // Check if there are any rows of data
//       if (!data.table.rows || data.table.rows.length === 0) {
//         console.log("No data rows found in the sheet")
//         // Set empty arrays for transactions and allTransactions
//         setTransactions([])
//         setAllTransactions([])
//         // Reset stats
//         setStats({
//           totalRevenue: 0,
//           services: 0,
//           cardPayments: 0,
//           averageSale: 0
//         })
//         setLoading(false)
//         return
//       }
      
//       // Extract and transform data rows with safer handling
//       const rowsData = data.table.rows.map((row, rowIndex) => {
//         const rowData = {}
        
//         // Add an internal unique ID and row index for updates
//         rowData._id = Math.random().toString(36).substring(2, 15)
//         rowData._rowIndex = rowIndex + 2 // +2 for header row and 1-indexing
        
//         // Process each cell carefully
//         row.c && row.c.forEach((cell, index) => {
//           if (index < headers.length) {
//             const header = headers[index]
            
//             // Handle null or undefined cell
//             if (!cell) {
//               rowData[header.id] = ''
//               return
//             }
            
//             // Special handling for discount column
//             if (header.label.toLowerCase().includes('discount')) {
//               const value = cell.v !== undefined && cell.v !== null ? cell.v : ''
              
//               // Convert decimal to percentage if it's between 0 and 1
//               if (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 1) {
//                 rowData[header.id] = `${(parseFloat(value) * 100).toFixed(0)}%`
//               } else {
//                 rowData[header.id] = value
//               }
              
//               // If there's a formatted value, store it
//               if (cell.f) {
//                 rowData[`${header.id}_formatted`] = cell.f
//               }
              
//               return // Skip the rest of the processing for this column
//             }
            
//             // Get the value, with fallbacks
//             const value = cell.v !== undefined && cell.v !== null ? cell.v : ''
//             rowData[header.id] = value
            
//             // Store formatted version if available
//             if (cell.f) {
//               rowData[`${header.id}_formatted`] = cell.f
//             }
            
//             // Special handling for dates
//             if (header.type === 'date' || header.label.toLowerCase().includes('date')) {
//               if (cell.f) {
//                 // Use the formatted date string if available
//                 rowData[`${header.id}_formatted`] = cell.f
//               } else if (value) {
//                 try {
//                   // Try to format the date value
//                   const dateObj = new Date(value)
//                   if (!isNaN(dateObj.getTime())) {
//                     rowData[`${header.id}_formatted`] = dateObj.toLocaleDateString()
//                   }
//                 } catch (e) {
//                   console.log("Date formatting error:", e)
//                 }
//               }
//             }
//           }
//         })
//         // Filter out rows with no actual data - more thorough check
//         const hasActualData = Object.keys(rowData)
//           .filter(key => !key.startsWith('_')) // Exclude our internal properties
//           .some(key => rowData[key] !== '')
          
//         return hasActualData ? rowData : null
//       })
//       .filter(row => row !== null && Object.keys(row).length > 1) // Filter out empty rows and nulls
      
//       // Check if we actually have any valid rows after filtering
//       if (rowsData.length === 0) {
//         console.log("No valid data rows found after processing")
//         setTransactions([])
//         setAllTransactions([])
//         setStats({
//           totalRevenue: 0,
//           services: 0,
//           cardPayments: 0,
//           averageSale: 0
//         })
//         setLoading(false)
//         return
//       }
      
//       // Find the staff name column index (column J - index 9)
//       const staffNameColumnIndex = 9 // Column J is typically index 9 (0-based indexing)
//       const staffNameColumnId = headers[staffNameColumnIndex]?.id
      
//       console.log("Using staff name column J with id:", staffNameColumnId)
      
//       // Find the status column (by looking for 'status' in the label)
//       const statusHeader = headers.find(h => 
//         h.label && (h.label.toLowerCase() === 'status' || h.label.toLowerCase().includes('status'))
//       );
//       const statusColumnId = statusHeader?.id;
      
//       console.log("Using status column with id:", statusColumnId);
      
//       // Debug: Log staff names in the data
//       if (user?.role === "staff") {
//         const staffNames = rowsData.map(row => row[staffNameColumnId] || "").filter(Boolean)
//         console.log("All staff names in data:", [...new Set(staffNames)])
//         console.log("User's staff name:", user.staffName)
//       }
      
//       // Filter transactions for staff users (similar to Booking component)
//       // For admin users, don't filter by staff
//       let staffFilteredRows = rowsData
//       if (user?.role === "staff" && staffNameColumnId) {
//         staffFilteredRows = rowsData.filter(row => {
//           const staffNameInTransaction = (row[staffNameColumnId] || "").toString().trim().toLowerCase()
          
//           // User identifiers from login data - for matching
//           const userStaffName = (user.staffName || "").toString().trim().toLowerCase()
//           const userName = (user.name || "").toString().trim().toLowerCase()
//           const userEmail = (user.email || "").toString().trim().toLowerCase()
          
//           // Debug output for tracking staff name matching
//           console.log(`Comparing transaction staff: "${staffNameInTransaction}" with user identifiers:`, {
//             staffName: userStaffName,
//             name: userName,
//             email: userEmail
//           })
          
//           // Simple exact matching with case-insensitivity
//           const isMatch = 
//             staffNameInTransaction === userStaffName ||
//             staffNameInTransaction === userName ||
//             staffNameInTransaction === userEmail
          
//           if (isMatch) {
//             console.log(`✓ MATCH FOUND for transaction with staff: "${staffNameInTransaction}"`)
//           }
          
//           return isMatch
//         })
        
//         console.log(`After staff filtering: ${staffFilteredRows.length} transactions will be displayed from ${rowsData.length} total`)
//       }
      
//       // Now filter by "Completed" status
//       let completedTransactions = staffFilteredRows;
//       if (statusColumnId) {
//         console.log("Filtering by 'Completed' status");
//         completedTransactions = staffFilteredRows.filter(row => {
//           const status = (row[statusColumnId] || "").toString().trim();
//           const isCompleted = status.toLowerCase() === "completed";
          
//           if (isCompleted) {
//             console.log(`✓ COMPLETED status found for transaction: ${row._id}`);
//           }
          
//           return isCompleted;
//         });
        
//         console.log(`After status filtering: ${completedTransactions.length} transactions have 'Completed' status`);
//       }
      
//       // Save all transactions for history view (already filtered by staff)
//       // For history view, we want ALL transactions, not just completed ones
//       setAllTransactions(staffFilteredRows)
      
//       // Find the date field
//       const dateField = headers.find(h => h.label && h.label.toLowerCase().includes('date'))?.id
      
//       const filteredTransactions = dateField 
//         ? completedTransactions.filter(row => {
//             if (!row[dateField]) return false
            
//             // Try to match the date in different formats
//             const rowDate = row[dateField]
            
//             // Check formatted date
//             if (row[`${dateField}_formatted`]) {
//               const formattedDate = new Date(row[`${dateField}_formatted`])
//               if (!isNaN(formattedDate.getTime())) {
//                 const formattedDateStr = formattedDate.toISOString().split('T')[0]
//                 if (formattedDateStr === date) return true
//               }
//             }
            
//             // For Google Sheets date format: Date(year,month,day)
//             if (typeof rowDate === 'string' && rowDate.startsWith('Date(')) {
//               const match = /Date\((\d+),(\d+),(\d+)\)/.exec(rowDate)
//               if (match) {
//                 const year = parseInt(match[1], 10)
//                 const month = parseInt(match[2], 10) // 0-indexed
//                 const day = parseInt(match[3], 10)
                
//                 const sheetDate = new Date(year, month, day)
//                 const selectedDate = new Date(date)
                
//                 // Compare year, month, and day
//                 if (sheetDate.getFullYear() === selectedDate.getFullYear() &&
//                     sheetDate.getMonth() === selectedDate.getMonth() &&
//                     sheetDate.getDate() === selectedDate.getDate()) {
//                   return true
//                 }
//               }
//             }
            
//             // Try direct comparison
//             try {
//               const rowDateObj = new Date(rowDate)
//               if (!isNaN(rowDateObj.getTime())) {
//                 const rowDateStr = rowDateObj.toISOString().split('T')[0]
//                 return rowDateStr === date
//               }
//             } catch (e) {
//               console.log("Date comparison error:", e)
//             }
            
//             return false
//           })
//         : completedTransactions
      
//       setTransactions(filteredTransactions)
      
//       // Calculate statistics for dashboard cards (only for completed transactions)
//       let totalAmount = 0
//       let cardPayments = 0
      
//       // Find field names in the data
//       const amountField = headers.find(h => 
//         h.label && (h.label.toLowerCase().includes('amount') || 
//                     h.label.toLowerCase().includes('price') || 
//                     h.label.toLowerCase().includes('revenue'))
//       )?.id || 'amount'
      
//       const paymentMethodField = headers.find(h => 
//         h.label && (h.label.toLowerCase().includes('payment') || 
//                    h.label.toLowerCase().includes('method'))
//       )?.id || 'paymentMethod'
      
//       // Calculate totals
//       filteredTransactions.forEach(row => {
//         if (row[amountField] && !isNaN(parseFloat(row[amountField]))) {
//           const amount = parseFloat(row[amountField])
//           totalAmount += amount
          
//           // Check for card payments
//           const paymentMethod = row[paymentMethodField]?.toString().toLowerCase() || ''
//           if (paymentMethod.includes('card') || 
//               paymentMethod.includes('credit') || 
//               paymentMethod.includes('debit')) {
//             cardPayments += amount
//           }
//         }
//       })
      
//       // Update the stats
//       setStats({
//         totalRevenue: totalAmount,
//         services: filteredTransactions.length,
//         cardPayments: cardPayments,
//         averageSale: filteredTransactions.length > 0 ? totalAmount / filteredTransactions.length : 0
//       })
      
//       setLoading(false)
//     } catch (error) {
//       console.error("Error fetching Google Sheet data:", error)
//       setError("Failed to load transaction data")
//       setLoading(false)
//     }
//   }

//   fetchGoogleSheetData()
// }, [date, user]) // Add user to dependency array so it refetches when user changes


useEffect(() => {
  const fetchGoogleSheetData = async () => {
    try {
      setLoading(true)
      console.log("Starting to fetch Google Sheet data...")
      console.log("Current user data:", user) // Debug: Log user data
      
      // Create URL to fetch the sheet in JSON format (this method works for public sheets)
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
      console.log("Fetching from URL:", url)
      
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }
      
      // Extract the JSON part from the response (Google returns a weird format)
      const text = await response.text()
      const jsonStart = text.indexOf('{')
      const jsonEnd = text.lastIndexOf('}')
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)
      
      // Extract headers from cols
      const headers = data.table.cols.map((col, index) => ({
        id: `col${index}`,
        label: col.label || col.id,
        type: col.type
      })).filter(header => header.label) // Filter out empty headers
      
      setTableHeaders(headers)
      
      // Check if there are any rows of data
      if (!data.table.rows || data.table.rows.length === 0) {
        console.log("No data rows found in the sheet")
        setTransactions([])
        setAllTransactions([])
        setStats({
          totalRevenue: 0,
          services: 0,
          cardPayments: 0,
          averageSale: 0
        })
        setLoading(false)
        return
      }
      
      // Extract and transform data rows with safer handling
      const rowsData = data.table.rows.map((row, rowIndex) => {
        const rowData = {}
        
        // Add an internal unique ID and row index for updates
        rowData._id = Math.random().toString(36).substring(2, 15)
        rowData._rowIndex = rowIndex + 2 // +2 for header row and 1-indexing
        
        // Process each cell carefully
        row.c && row.c.forEach((cell, index) => {
          if (index < headers.length) {
            const header = headers[index]
            
            // Handle null or undefined cell
            if (!cell) {
              rowData[header.id] = ''
              return
            }
            
            // Get the value, with fallbacks
            const value = cell.v !== undefined && cell.v !== null ? cell.v : ''
            rowData[header.id] = value
            
            // Store formatted version if available
            if (cell.f) {
              rowData[`${header.id}_formatted`] = cell.f
            }
          }
        })
        
        // Filter out rows with no actual data - more thorough check
        const hasActualData = Object.keys(rowData)
          .filter(key => !key.startsWith('_')) // Exclude our internal properties
          .some(key => rowData[key] !== '')
          
        return hasActualData ? rowData : null
      })
      .filter(row => row !== null && Object.keys(row).length > 1) // Filter out empty rows and nulls
      
      // Check if we actually have any valid rows after filtering
      if (rowsData.length === 0) {
        console.log("No valid data rows found after processing")
        setTransactions([])
        setAllTransactions([])
        setStats({
          totalRevenue: 0,
          services: 0,
          cardPayments: 0,
          averageSale: 0
        })
        setLoading(false)
        return
      }
      
      // Find the staff name column index (column J - index 9)
      const staffNameColumnIndex = 9 // Column J is typically index 9 (0-based indexing)
      const staffNameColumnId = headers[staffNameColumnIndex]?.id
      
      console.log("Using staff name column J with id:", staffNameColumnId)
      
      // Find the status column (by looking for 'status' in the label)
      const statusHeader = headers.find(h => 
        h.label && (h.label.toLowerCase() === 'status' || h.label.toLowerCase().includes('status'))
      );
      const statusColumnId = statusHeader?.id;
      
      console.log("Using status column with id:", statusColumnId);
      
      // Find the revenue column (Column M - index 12)
      const revenueColumnIndex = 12 // Column M is index 12 
      const revenueColumnId = headers[revenueColumnIndex]?.id
      console.log("Using revenue column M with id:", revenueColumnId)
      
      // Find the payment method column for card payments
      const paymentMethodHeader = headers.find(h => 
        h.label && (h.label.toLowerCase().includes('payment') || 
                   h.label.toLowerCase().includes('method'))
      )?.id;
      
      // Debug: Log staff names in the data
      if (user?.role === "staff") {
        const staffNames = rowsData.map(row => row[staffNameColumnId] || "").filter(Boolean)
        console.log("All staff names in data:", [...new Set(staffNames)])
        console.log("User's staff name:", user.staffName)
      }
      
      // Filter transactions for staff users (similar to Booking component)
      // For admin users, don't filter by staff
      let staffFilteredRows = rowsData
      if (user?.role === "staff" && staffNameColumnId) {
        staffFilteredRows = rowsData.filter(row => {
          const staffNameInTransaction = (row[staffNameColumnId] || "").toString().trim().toLowerCase()
          
          // User identifiers from login data - for matching
          const userStaffName = (user.staffName || "").toString().trim().toLowerCase()
          const userName = (user.name || "").toString().trim().toLowerCase()
          const userEmail = (user.email || "").toString().trim().toLowerCase()
          
          // Simple exact matching with case-insensitivity
          const isMatch = 
            staffNameInTransaction === userStaffName ||
            staffNameInTransaction === userName ||
            staffNameInTransaction === userEmail
          
          return isMatch
        })
      }
      
      // Now filter by "Completed" status
      let completedTransactions = staffFilteredRows;
      if (statusColumnId) {
        console.log("Filtering by 'Completed' status");
        completedTransactions = staffFilteredRows.filter(row => {
          const status = (row[statusColumnId] || "").toString().trim();
          return status.toLowerCase() === "completed";
        });
      }
      
      // Save all transactions for history view (already filtered by staff)
      setAllTransactions(staffFilteredRows)
      
      // Find the date field
      const dateField = headers.find(h => h.label && h.label.toLowerCase().includes('date'))?.id
      
      const filteredTransactions = dateField 
        ? completedTransactions.filter(row => {
            if (!row[dateField]) return false
            
            // Try to match the date in different formats
            const rowDate = row[dateField]
            
            // Check formatted date
            if (row[`${dateField}_formatted`]) {
              const formattedDate = new Date(row[`${dateField}_formatted`])
              if (!isNaN(formattedDate.getTime())) {
                const formattedDateStr = formattedDate.toISOString().split('T')[0]
                if (formattedDateStr === date) return true
              }
            }
            
            // For Google Sheets date format: Date(year,month,day)
            if (typeof rowDate === 'string' && rowDate.startsWith('Date(')) {
              const match = /Date\((\d+),(\d+),(\d+)\)/.exec(rowDate)
              if (match) {
                const year = parseInt(match[1], 10)
                const month = parseInt(match[2], 10) // 0-indexed
                const day = parseInt(match[3], 10)
                
                const sheetDate = new Date(year, month, day)
                const selectedDate = new Date(date)
                
                // Compare year, month, and day
                if (sheetDate.getFullYear() === selectedDate.getFullYear() &&
                    sheetDate.getMonth() === selectedDate.getMonth() &&
                    sheetDate.getDate() === selectedDate.getDate()) {
                  return true
                }
              }
            }
            
            // Try direct comparison
            try {
              const rowDateObj = new Date(rowDate)
              if (!isNaN(rowDateObj.getTime())) {
                const rowDateStr = rowDateObj.toISOString().split('T')[0]
                return rowDateStr === date
              }
            } catch (e) {
              console.log("Date comparison error:", e)
            }
            
            return false
          })
        : completedTransactions
      
      setTransactions(filteredTransactions)
      
      // Calculate statistics for dashboard cards
      let totalRevenue = 0
      let cardPayments = 0
      
      // Calculate totals using the specific revenue column (M)
      filteredTransactions.forEach(row => {
        if (row[revenueColumnId] && !isNaN(parseFloat(row[revenueColumnId]))) {
          const revenue = parseFloat(row[revenueColumnId])
          totalRevenue += revenue
          
          // Check for card payments
          if (paymentMethodHeader) {
            const paymentMethod = row[paymentMethodHeader]?.toString().toLowerCase() || ''
            if (paymentMethod.includes('card') || 
                paymentMethod.includes('credit') || 
                paymentMethod.includes('debit')) {
              cardPayments += revenue
            }
          }
        }
      })
      
      // Update the stats
      setStats({
        totalRevenue: totalRevenue,
        services: filteredTransactions.length,
        cardPayments: cardPayments,
        averageSale: filteredTransactions.length > 0 ? totalRevenue / filteredTransactions.length : 0
      })
      
      setLoading(false)
    } catch (error) {
      console.error("Error fetching Google Sheet data:", error)
      setError("Failed to load transaction data")
      setLoading(false)
    }
  }

  fetchGoogleSheetData()
}, [date, user])
  // Filter transactions by search term (similar to Inventory)
  const filteredTransactions = searchTerm
    ? transactions.filter(transaction => 
        Object.values(transaction).some(value => 
          value && value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    : transactions

  // Update the handleEditClick function to initialize selected services
  const handleEditClick = (transaction) => {
    console.log("Editing transaction with original values:", transaction);
    
    // Create a deep copy to avoid modifying the original transaction
    const transactionCopy = JSON.parse(JSON.stringify(transaction));
    
    // Special handling for timestamp field - set current date if empty
    const timestampHeader = tableHeaders.find(header => 
      header.label.toLowerCase().includes('timestamp') || 
      header.label.toLowerCase().includes('time stamp')
    );
    
    if (timestampHeader && !transactionCopy[timestampHeader.id]) {
      const today = new Date();
      const day = today.getDate().toString().padStart(2, '0');
      const month = (today.getMonth() + 1).toString().padStart(2, '0');
      const year = today.getFullYear();
      
      // Format date as DD/MM/YYYY to match the expected format
      transactionCopy[timestampHeader.id] = `${day}/${month}/${year}`;
    }
    
    // Keep the original Google Sheets date format in a special property
    // This will be used when submitting the form
    tableHeaders.forEach(header => {
      if (header.type === 'date' || header.label.toLowerCase().includes('date')) {
        // Store the original date value for submission
        transactionCopy[`${header.id}_original`] = transactionCopy[header.id];
        
        // Convert the date for display in the form fields
        if (transactionCopy[header.id]) {
          // For Google Sheets date format: Date(year,month,day)
          if (typeof transactionCopy[header.id] === 'string' && 
              transactionCopy[header.id].startsWith('Date(')) {
            const match = /Date\((\d+),(\d+),(\d+)\)/.exec(transactionCopy[header.id]);
            if (match) {
              const year = parseInt(match[1], 10);
              const month = parseInt(match[2], 10) + 1; // Convert from 0-indexed to 1-indexed month
              const day = parseInt(match[3], 10);
              
              // Format as DD/MM/YYYY for display
              transactionCopy[`${header.id}_display`] = `${day}/${month}/${year}`;
              
              // If this field is for a form input, also prepare the YYYY-MM-DD format
              if (header.label.toLowerCase().includes('date') && 
                  !header.label.toLowerCase().includes('timestamp')) {
                // For date input field, format as YYYY-MM-DD
                transactionCopy[header.id] = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              }
            }
          }
        }
      }
    });
    
    console.log("Prepared transaction for editing:", transactionCopy);
    
    // Check if there are any existing extra services to initialize the multiselect
    const extraServiceHeader = tableHeaders.find(h => 
      h.label.toLowerCase().includes('extra service') && 
      !h.label.toLowerCase().includes('price')
    );
    
    if (extraServiceHeader && transactionCopy[extraServiceHeader.id]) {
      // If there are existing extra services, parse them
      // They might be comma-separated values like "Hair, Massage"
      const existingServices = transactionCopy[extraServiceHeader.id]
        .split(',')
        .map(service => service.trim())
        .filter(service => service !== '');
      
      setSelectedExtraServices(existingServices);
    } else {
      // Reset selected services if none
      setSelectedExtraServices([]);
    }
    
    setEditingTransaction(transactionCopy);
    setShowEditForm(true);
  };

  // Create a new function to handle checkbox changes for extra services
 // Create a new function to handle checkbox changes for extra services
// Create a new function to handle checkbox changes for extra services
// Modified function with improved debugging and service price retrieval
const handleExtraServiceCheckboxChange = (service) => {
  console.log("Service clicked:", service.name, "Price:", service.price);
  console.log("Current editing transaction:", editingTransaction);
  
  // Check if service is already selected
  const isSelected = selectedExtraServices.includes(service.name);
  
  let updatedSelectedServices;
  if (isSelected) {
    // Remove the service if already selected
    updatedSelectedServices = selectedExtraServices.filter(name => name !== service.name);
  } else {
    // Add the service if not selected
    updatedSelectedServices = [...selectedExtraServices, service.name];
  }
  
  // Update state for selected services
  setSelectedExtraServices(updatedSelectedServices);
  
  // Find relevant headers
  const extraServiceHeader = tableHeaders.find(h => 
    h.label.toLowerCase().includes('extra service') && 
    !h.label.toLowerCase().includes('price')
  );
  
  const extraServicePriceHeader = tableHeaders.find(h => 
    h.label.toLowerCase().includes('extra service') && 
    h.label.toLowerCase().includes('price')
  );
  
  const totalAmountHeader = tableHeaders.find(h => 
    h.label.toLowerCase().includes('total') && 
    h.label.toLowerCase().includes('amount')
  );
  
  const servicePriceHeader = tableHeaders.find(h => 
    h.label && h.label.toLowerCase().includes('service price') && 
    !h.label.toLowerCase().includes('extra')
  );
  
  console.log("Headers found:", { 
    extraServiceHeader: extraServiceHeader?.id, 
    extraServicePriceHeader: extraServicePriceHeader?.id,
    totalAmountHeader: totalAmountHeader?.id,
    servicePriceHeader: servicePriceHeader?.id
  });
  
  // Calculate total price for all selected services
  let totalExtraPrice = 0;
  updatedSelectedServices.forEach(serviceName => {
    const service = extraServices.find(s => s.name === serviceName);
    if (service) {
      const servicePrice = parseFloat(service.price || 0);
      totalExtraPrice += servicePrice;
      console.log(`Added service: ${serviceName}, price: ${servicePrice}, running total: ${totalExtraPrice}`);
    }
  });
  
  // Join selected services with comma for display
  const extraServiceText = updatedSelectedServices.join(', ');
  
  // Update the editing transaction with new values
  const updatedTransaction = { ...editingTransaction };
  
  // Update extra service field with the comma-separated service names
  if (extraServiceHeader) {
    updatedTransaction[extraServiceHeader.id] = extraServiceText;
  }
  
  // Update extra service price field with the sum of all selected service prices
  if (extraServicePriceHeader) {
    updatedTransaction[extraServicePriceHeader.id] = totalExtraPrice.toFixed(2);
  }
  
  // Get the service price - check all possible ways it might be stored
  let servicePrice = 0;
  
  if (servicePriceHeader) {
    // Log all the properties in the transaction to help debug
    console.log("All properties in transaction:", Object.keys(updatedTransaction));
    console.log("Service price from header id:", updatedTransaction[servicePriceHeader.id]);
    
    // Try to find service price field by header id
    if (updatedTransaction[servicePriceHeader.id] !== undefined) {
      servicePrice = parseFloat(updatedTransaction[servicePriceHeader.id]) || 0;
    } 
    // Try to find by 'ServicePrice' key directly if header approach fails
    else if (updatedTransaction['ServicePrice'] !== undefined) {
      servicePrice = parseFloat(updatedTransaction['ServicePrice']) || 0;
    }
    // Try lowercase version
    else if (updatedTransaction['serviceprice'] !== undefined) {
      servicePrice = parseFloat(updatedTransaction['serviceprice']) || 0;
    }
    // Final fallback - search for any key containing 'service' and 'price'
    else {
      const possibleKeys = Object.keys(updatedTransaction).filter(key => 
        key.toLowerCase().includes('service') && 
        key.toLowerCase().includes('price') && 
        !key.toLowerCase().includes('extra')
      );
      
      console.log("Possible service price keys:", possibleKeys);
      
      if (possibleKeys.length > 0) {
        servicePrice = parseFloat(updatedTransaction[possibleKeys[0]]) || 0;
      }
    }
  }
  
  console.log("Found Service Price:", servicePrice);
  console.log("Extra Service Price Total:", totalExtraPrice);
  
  // Calculate the new total
  const newTotal = servicePrice + totalExtraPrice;
  console.log("New Total Amount:", newTotal);
  
  // Update total amount field
  if (totalAmountHeader) {
    updatedTransaction[totalAmountHeader.id] = newTotal.toFixed(2);
  }
  
  // Update the editing transaction state
  setEditingTransaction(updatedTransaction);
};

  const fetchPromoCards = async () => {
    try {
      setLoadingPromos(true);
      
      // Use the same sheetId but different sheet name for promos
      const promoSheetName = 'Promo Cards';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(promoSheetName)}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch promo data: ${response.status}`);
      }
      
      const text = await response.text();
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}');
      const jsonString = text.substring(jsonStart, jsonEnd + 1);
      const data = JSON.parse(jsonString);
      
      if (!data.table || !data.table.rows) {
        console.log("No promo data found");
        setPromoCards([]);
        setLoadingPromos(false);
        return;
      }
      
      // Extract headers from cols
      const headers = data.table.cols.map((col, index) => ({
        id: `col${index}`,
        label: col.label || col.id,
        type: col.type
      })).filter(header => header.label);
      
      // Find relevant column indices
      const codeColumnIndex = headers.findIndex(h => h.label.toLowerCase().includes('code'));
      const discountColumnIndex = headers.findIndex(h => h.label.toLowerCase().includes('discount'));
      const descriptionColumnIndex = headers.findIndex(h => h.label.toLowerCase().includes('description'));
      const deletedColumnIndex = headers.findIndex(h => h.label.toLowerCase().includes('delete'));
      
      // Process rows
      const promos = data.table.rows
        .filter(row => {
          // Skip deleted promos
          const isDeleted = deletedColumnIndex !== -1 && 
                          row.c && 
                          row.c.length > deletedColumnIndex && 
                          row.c[deletedColumnIndex] && 
                          row.c[deletedColumnIndex].v === "Yes";
          return !isDeleted && row.c && row.c.some(cell => cell && cell.v);
        })
        .map(row => {
          // Basic info for each promo card
          const promoData = {
            id: Math.random().toString(36).substring(2, 15),
            code: row.c[codeColumnIndex]?.v || 'Unknown',
            discount: parseFloat(row.c[discountColumnIndex]?.v) || 0,
            description: row.c[descriptionColumnIndex]?.v || ''
          };
          
          return promoData;
        })
        .filter(promo => promo.discount > 0); // Only include promos with actual discounts
      
      setPromoCards(promos);
      console.log("Loaded promo cards:", promos);
    } catch (error) {
      console.error("Error fetching promo cards:", error);
    } finally {
      setLoadingPromos(false);
    }
  };

  // Add a function to handle opening the discount form
  const handleAddDiscountClick = () => {
    setShowDiscountForm(true);
    fetchPromoCards(); // Fetch promo cards when opening the form
  };

  // Add a function to handle selecting a promo
  const handleSelectPromo = (promo) => {
    setSelectedPromo(promo);
    
    // Find the total amount field in the current transaction
    const totalAmountHeader = tableHeaders.find(h => 
      h.label.toLowerCase().includes('total') && 
      h.label.toLowerCase().includes('amount')
    );
    
    if (totalAmountHeader && editingTransaction[totalAmountHeader.id]) {
      const totalAmount = parseFloat(editingTransaction[totalAmountHeader.id]) || 0;
      const discountPercentage = promo.discount || 0;
      
      // Calculate discount amount
      const discount = (totalAmount * discountPercentage) / 100;
      setDiscountAmount(discount.toFixed(2));
      
      // Calculate new total with discount
      const newTotal = (totalAmount - discount).toFixed(2);
      
      // Update the total in the editing transaction
      const updatedTransaction = {
        ...editingTransaction,
        [totalAmountHeader.id]: newTotal,
        // Also store the applied discount info for reference
        _appliedDiscount: {
          code: promo.code,
          percentage: discountPercentage,
          amount: discount.toFixed(2)
        }
      };
      
      setEditingTransaction(updatedTransaction);
    }
  };

  // Add function to close the discount form
  const handleCloseDiscountForm = () => {
    setShowDiscountForm(false);
    setSelectedPromo(null);
  };

  // Add function to remove applied discount
  const handleRemoveDiscount = () => {
    const totalAmountHeader = tableHeaders.find(h => 
      h.label.toLowerCase().includes('total') && 
      h.label.toLowerCase().includes('amount')
    );
    
    // Find service price and extra service price to recalculate total
    const servicePriceHeader = tableHeaders.find(h => 
      h.label.toLowerCase().includes('service price') && 
      !h.label.toLowerCase().includes('extra')
    );
    
    const extraServicePriceHeader = tableHeaders.find(h => 
      h.label.toLowerCase().includes('extra service price')
    );
    
    if (totalAmountHeader) {
      // Recalculate total from service prices
      const servicePrice = parseFloat(editingTransaction[servicePriceHeader?.id] || 0) || 0;
      const extraServicePrice = parseFloat(editingTransaction[extraServicePriceHeader?.id] || 0) || 0;
      const newTotal = (servicePrice + extraServicePrice).toFixed(2);
      
      // Update the total without discount
      const updatedTransaction = {
        ...editingTransaction,
        [totalAmountHeader.id]: newTotal
      };
      
      // Remove the discount info
      delete updatedTransaction._appliedDiscount;
      
      setEditingTransaction(updatedTransaction);
      setSelectedPromo(null);
      setDiscountAmount(0);
    }
  };
  
  // Modify the renderFormField function to handle the multi-select dropdown
  const renderFormField = (header) => {
    const headerLabel = header.label.toLowerCase();
    
    // For timestamp fields, render with DD/MM/YYYY format
    if (headerLabel.includes('timestamp') || headerLabel.includes('time stamp')) {
      // Check if we have a pre-formatted display value
      const displayValue = editingTransaction[`${header.id}_display`] || editingTransaction[header.id] || '';
      
      return (
        <input
          type="text"
          id={`edit-${header.id}`}
          name={header.id}
          value={displayValue}
          onChange={handleEditInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        />
      );
    }
    
    // Date fields (other than timestamp)
    if (header.type === 'date' || headerLabel.includes('date')) {
      // For date inputs, use YYYY-MM-DD format
      let dateValue = editingTransaction[header.id] || '';
      
      return (
        <input
          type="date"
          id={`edit-${header.id}`}
          name={header.id}
          value={dateValue}
          onChange={handleEditInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        />
      );
    }

    // Extra Service field - Render as multi-select dropdown with checkboxes
    if (headerLabel.includes('extra service') && !headerLabel.includes('price')) {
      return (
        <div className="mt-1 relative">
          <div className="block w-full rounded-md border border-gray-300 shadow-sm focus-within:border-pink-500 focus-within:ring-pink-500 overflow-hidden">
            {/* Selected services display */}
            <div className="p-2 min-h-[40px] bg-white">
              {selectedExtraServices.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedExtraServices.map(serviceName => (
                    <span key={serviceName} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-pink-100 text-pink-800">
                      {serviceName}
                      <button 
                        type="button"
                        className="ml-1 text-pink-600 hover:text-pink-900"
                        onClick={() => handleExtraServiceCheckboxChange({name: serviceName})}
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-gray-400 text-sm">Select extra services</span>
              )}
            </div>
            
            {/* Dropdown with checkboxes */}
            <div className="max-h-60 overflow-y-auto border-t border-gray-200 bg-gray-50">
              {extraServices.map((service, index) => (
                <div key={index} className="flex items-center px-3 py-2 hover:bg-gray-100">
                  <input
                    type="checkbox"
                    id={`service-${index}`}
                    checked={selectedExtraServices.includes(service.name)}
                    onChange={() => handleExtraServiceCheckboxChange(service)}
                    className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                  />
                  <label htmlFor={`service-${index}`} className="ml-3 flex justify-between w-full">
                    <span className="text-sm text-gray-700">{service.name}</span>
                    <span className="text-sm font-medium text-gray-900">₹{parseFloat(service.price).toFixed(2)}</span>
                  </label>
                </div>
              ))}
              {extraServices.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-500">No extra services available</div>
              )}
            </div>
          </div>
          
          {/* Hidden input to store the actual value */}
          <input
            type="hidden"
            id={`edit-${header.id}`}
            name={header.id}
            value={selectedExtraServices.join(', ')}
          />
        </div>
      );
    }
    
    // Extra Service Price field - Make read-only since it's calculated
    if (headerLabel.includes('extra service') && headerLabel.includes('price')) {
      return (
        <input 
          type="number"
          id={`edit-${header.id}`} 
          name={header.id}
          value={editingTransaction[header.id] || ''}
          onChange={handleEditInputChange}
          min={0}
          step="0.01"
          readOnly={true} // Make read-only since it's calculated automatically
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-pink-500 focus:ring-pink-500" 
        />
      );
    }
    
    // Total Amount field - Make read-only since it's calculated
    if (headerLabel.includes('total') && headerLabel.includes('amount')) {
      return (
        <input 
          type="number"
          id={`edit-${header.id}`} 
          name={header.id}
          value={editingTransaction[header.id] || ''}
          onChange={handleEditInputChange}
          min={0}
          step="0.01"
          readOnly={true} // Make read-only since it's calculated automatically
          className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-pink-500 focus:ring-pink-500" 
        />
      );
    }
    
    // Status field - Render as dropdown with Completed and Cancel options
    if (headerLabel === 'status' || headerLabel.includes('status')) {
      return (
        <select
          id={`edit-${header.id}`}
          name={header.id}
          value={editingTransaction[header.id] || ''}
          onChange={handleEditInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        >
          <option value="">Select Status</option>
          <option value="Completed">Completed</option>
          <option value="Cancel">Cancel</option>
        </select>
      );
    }
    
    // Amount/Price fields
    if (headerLabel.includes('amount') || 
        headerLabel.includes('price') || 
        headerLabel.includes('revenue')) {
      return (
        <input 
          type="number"
          id={`edit-${header.id}`} 
          name={header.id}
          value={editingTransaction[header.id] || ''}
          onChange={handleEditInputChange}
          min={0}
          step="0.01"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500" 
        />
      );
    }
    
    // Payment method field with common options
    if (headerLabel.includes('payment') || headerLabel.includes('method')) {
      return (
        <select
          id={`edit-${header.id}`}
          name={header.id}
          value={editingTransaction[header.id] || ''}
          onChange={handleEditInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
        >
          <option value="">Select Payment Method</option>
          <option value="Cash">Cash</option>
          <option value="Card">Card</option>
          <option value="UPI">UPI</option>
          <option value="Online">Online</option>
        </select>
      );
    }
    
    // Default text input for all other fields
    return (
      <input
        type="text"
        id={`edit-${header.id}`}
        name={header.id} 
        value={editingTransaction[header.id] || ''}
        onChange={handleEditInputChange}
        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500"
      />
    );
  };

  // Update the handleEditInputChange function to auto-calculate amounts when service price changes
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field changed: ${name} with value: ${value}`); // Debug log
    
    // Create the updated transaction state
    const updatedTransaction = {
      ...editingTransaction,
      [name]: value
    };
    
    // Get the header information for the field that is being edited
    const currentHeader = tableHeaders.find(h => h.id === name);
    
    // Check if this is a service price field (not an extra service price)
    if (currentHeader && 
        currentHeader.label.toLowerCase().includes('service price') && 
        !currentHeader.label.toLowerCase().includes('extra')) {
      
      console.log("Service price field detected, recalculating total");
      
      // Find the total amount and extra service price fields
      const totalAmountHeader = tableHeaders.find(h => 
        h.label.toLowerCase().includes('total') && 
        h.label.toLowerCase().includes('amount')
      );
      
      const extraServicePriceHeader = tableHeaders.find(h => 
        h.label.toLowerCase().includes('extra service') && 
        h.label.toLowerCase().includes('price')
      );
      
      // Calculate new total
      if (totalAmountHeader && extraServicePriceHeader) {
        const servicePrice = parseFloat(value) || 0;
        const extraServicePrice = parseFloat(updatedTransaction[extraServicePriceHeader.id] || 0);
        const newTotal = servicePrice + extraServicePrice;
        
        updatedTransaction[totalAmountHeader.id] = newTotal.toFixed(2);
      }
    }
    
    setEditingTransaction(updatedTransaction);
  };

  // Update the handleEditSubmit function to handle the multi-select format
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const rowIndex = editingTransaction._rowIndex;
      
      if (!rowIndex) {
        throw new Error("Could not determine the row index for updating this transaction");
      }
      
      // Create a deep copy to avoid modifying the original
      const submissionData = JSON.parse(JSON.stringify(editingTransaction));
      
      // Remove the temporary properties we added
      tableHeaders.forEach(header => {
        delete submissionData[`${header.id}_original`];
        delete submissionData[`${header.id}_display`];
      });
      
      // Remove the applied discount info before submission (as it's only for UI reference)
      delete submissionData._appliedDiscount;
      
      // Prepare row data for submission - preserve original date format
      const rowData = tableHeaders.map(header => {
        // Get the value from our editing transaction
        let value = submissionData[header.id] || '';
        
        // For staff users, if the field wasn't shown in the form (and thus not updated),
        // we need to keep the original value from the transaction before editing
        if (user?.role === "staff") {
          const allowedFields = [
            "date", "booking id", "customer name", "service", 
            "service price", "extra service", "extra service price", 
            "totalamount", "status"
          ];
          
          const headerLabel = header.label.toLowerCase();
          const isAllowed = allowedFields.some(field => 
            headerLabel.includes(field)
          );
          
          // If field is not allowed for staff, use the original value from before editing
          if (!isAllowed) {
            // Find the original transaction in our transactions array
            const originalTransaction = transactions.find(t => t._id === editingTransaction._id);
            if (originalTransaction && originalTransaction[header.id] !== undefined) {
              value = originalTransaction[header.id];
            }
          }
        }
        
        // Special handling for date fields - keep the DD/MM/YYYY format instead of converting to Date()
        if ((header.type === 'date' || header.label.toLowerCase().includes('date')) && value) {
          // If the value is in YYYY-MM-DD format (from date input fields)
          if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = value.split('-').map(part => parseInt(part, 10));
            // Convert to DD/MM/YYYY format
            value = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
          }
        }
        
        // Special handling for timestamp column (column A)
        if (header.label.toLowerCase().includes('timestamp') || 
            (header.id === 'col0' && (header.label.toLowerCase().includes('date') || header.type === 'date'))) {
          // Ensure timestamp is always in DD/MM/YYYY format
          if (value) {
            // Handle various possible formats
            // If it's already in DD/MM/YYYY format, leave it
            if (value.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
              // Already in the correct format
            } 
            // If it's in Date() format, convert it
            else if (value.startsWith('Date(') && value.endsWith(')')) {
              const match = /Date\((\d+),(\d+),(\d+)\)/.exec(value);
              if (match) {
                const year = parseInt(match[1], 10);
                const month = parseInt(match[2], 10) + 1; // Convert from 0-indexed to 1-indexed month
                const day = parseInt(match[3], 10);
                
                // Format as DD/MM/YYYY for display
                value = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
              }
            }
            // If it's in YYYY-MM-DD format from a date input
            else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = value.split('-').map(part => parseInt(part, 10));
              value = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
            }
          }
        }
        
        return value;
      });
      
      console.log("Submitting data with preserved date formats:", rowData);
      
      const formData = new FormData();
      formData.append('sheetName', sheetName);
      formData.append('rowData', JSON.stringify(rowData));
      formData.append('rowIndex', rowIndex);
      formData.append('action', 'update');
      
      const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        body: formData
      });
      
      console.log("Update submitted successfully");
      
      // For UI display, ensure the dates look correct
      const uiTransaction = { ...editingTransaction };
      
      // Make sure dates display correctly in the UI
      tableHeaders.forEach(header => {
        if (header.type === 'date' || header.label.toLowerCase().includes('date')) {
          if (uiTransaction[header.id]) {
            // If it's a YYYY-MM-DD format from a date input
            if (uiTransaction[header.id].match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = uiTransaction[header.id].split('-').map(part => parseInt(part, 10));
              // Convert to DD/MM/YYYY format for display
              uiTransaction[`${header.id}_formatted`] = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
              uiTransaction[header.id] = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
            }
          }
        }
      });
      
      // Update transactions in state
      setTransactions(prev => 
        prev.map(transaction => 
          transaction._id === editingTransaction._id ? uiTransaction : transaction  
        )
      );
      
      // Update transaction in allTransactions
      setAllTransactions(prev =>
        prev.map(transaction =>
          transaction._id === editingTransaction._id ? uiTransaction : transaction
        )
      );
      
      // Recalculate stats if needed
      const amountField = tableHeaders.find(h => 
        h.label && (h.label.toLowerCase().includes('amount') || 
                  h.label.toLowerCase().includes('price') || 
                  h.label.toLowerCase().includes('revenue'))
      )?.id;
      
      if (amountField) {
        let totalAmount = 0;
        let cardPayments = 0;
        
        const paymentMethodField = tableHeaders.find(h => 
          h.label && (h.label.toLowerCase().includes('payment') || 
                   h.label.toLowerCase().includes('method'))
        )?.id;
        
        const updatedTransactions = transactions.map(transaction => 
          transaction._id === editingTransaction._id ? uiTransaction : transaction
        );
        
        updatedTransactions.forEach(row => {
          if (row[amountField] && !isNaN(parseFloat(row[amountField]))) {
            const amount = parseFloat(row[amountField]);
            totalAmount += amount;
            
            // Check for card payments
            if (paymentMethodField) {
              const paymentMethod = row[paymentMethodField]?.toString().toLowerCase() || '';
              if (paymentMethod.includes('card') || 
                  paymentMethod.includes('credit') || 
                  paymentMethod.includes('debit')) {
                cardPayments += amount;
              }
            }
          }
        });
        
        setStats({
          totalRevenue: totalAmount,
          services: updatedTransactions.length,
          cardPayments: cardPayments,
          averageSale: updatedTransactions.length > 0 ? totalAmount / updatedTransactions.length : 0
        });
      }
      
      setShowEditForm(false);
      setSelectedExtraServices([]); // Reset selected services
      
      setNotification({
        show: true,
        message: "Transaction updated successfully!",
        type: "success"
      });
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 3000);
    } catch (error) {
      console.error("Error updating transaction:", error);
        
      setNotification({
        show: true,
        message: `Failed to update transaction: ${error.message}`,
        type: "error" 
      });
      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" });
      }, 5000);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Open history modal
  const handleHistoryClick = () => {
    setHistorySearchTerm("");
    setShowHistoryModal(true);
  };
  
  // Function to filter history transactions
  const filteredHistoryTransactions = historySearchTerm
    ? allTransactions.filter(transaction => 
        Object.values(transaction).some(
          value => value && value.toString().toLowerCase().includes(historySearchTerm.toLowerCase())
        )
      )
    : allTransactions;

  // Helper function to format dates for display
  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '—';
    
    // If it's already in DD/MM/YYYY format, return as is
    if (typeof dateValue === 'string' && dateValue.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      return dateValue;
    }
    
    // For Google Sheets date format: Date(year,month,day)
    if (typeof dateValue === 'string' && dateValue.startsWith('Date(')) {
      const match = /Date\((\d+),(\d+),(\d+)\)/.exec(dateValue);
      if (match) {
        const year = parseInt(match[1], 10);
        const month = parseInt(match[2], 10) + 1; // Convert from 0-indexed to 1-indexed month
        const day = parseInt(match[3], 10);
        
        // Format as DD/MM/YYYY
        return `${day}/${month}/${year}`;
      }
    }
    
    // Try to parse as date object
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}/${month}/${year}`;
      }
    } catch (e) {
      console.log("Date parsing error:", e);
    }
    
    // Return original if all else fails
    return dateValue;
  };

  return (
    <div className="space-y-6">
      {/* Header - Updated with search bar and style matching Inventory */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Daily Entry</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}  
            />
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              />
            </div>
            
            {/* Only show history button if not hidden */}
            {!hideHistoryButton && (
              <button 
                className="flex items-center px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                onClick={handleHistoryClick}
              >
                <History size={18} className="mr-2" />
                View History
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <IndianRupee size={24} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">₹{stats.totalRevenue.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4">
            <Scissors size={24} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Services</p>
            <p className="text-2xl font-bold text-gray-800">{stats.services}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="rounded-full bg-purple-100 p-3 mr-4">
            <CreditCard size={24} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Card Payments</p>
            <p className="text-2xl font-bold text-gray-800">₹{stats.cardPayments.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex items-center">
          <div className="rounded-full bg-yellow-100 p-3 mr-4">
            <TrendingUp size={24} className="text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Sale</p>
            <p className="text-2xl font-bold text-gray-800">₹{stats.averageSale.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Transactions Table - Modified to match Booking component style */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-800">Today's Transactions</h3>
        </div>
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500 mb-4"></div>
            <p className="text-pink-600">Loading transaction data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md text-red-800 text-center">
            {error} <button className="underline ml-2" onClick={() => window.location.reload()}>Try again</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {tableHeaders.map((header) => (
                    <th
                      key={header.id}
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.label}
                    </th>
                  ))}
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <tr key={transaction._id}>
                      {tableHeaders.map((header) => {
                        // Special handling for price/amount fields (but NOT serial numbers)
                        if ((header.label.toLowerCase().includes('amount') || 
                            header.label.toLowerCase().includes('price') || 
                            header.label.toLowerCase().includes('commission') || 
                            header.label.toLowerCase().includes('total')) && 
                            !header.label.toLowerCase().includes('serial') && 
                            !header.label.toLowerCase().includes('sr') && 
                            !header.label.toLowerCase().includes('no') && 
                            header.type !== 'string') {
                          const value = transaction[header.id]
                          let displayValue = value
                          
                          if (!isNaN(parseFloat(value))) {
                            displayValue = '₹' + parseFloat(value).toFixed(2)
                          }
                          
                          return (
                            <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-green-600">{displayValue || '—'}</div>
                            </td>
                          )
                        }
                        
                        // For date fields
                        if (header.type === 'date' || header.label.toLowerCase().includes('date')) {
                          // Use our formatDateForDisplay helper for consistent formatting
                          const displayDate = formatDateForDisplay(transaction[header.id])
                          
                          return (
                            <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{displayDate}</div>
                            </td>
                          )
                        }
                        
                        // Default rendering for other columns
                        return (
                          <td key={header.id} className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{transaction[header.id] || '—'}</div>
                          </td>
                        )
                      })}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          className="text-pink-600 hover:text-pink-900" 
                          onClick={() => handleEditClick(transaction)}
                        >
                          <Edit size={16} className="inline mr-1" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={tableHeaders.length + 1} className="px-6 py-10 text-center text-gray-500">
                      {searchTerm ? "No transactions found matching the search" : "No transactions found for this date"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chart Section - Only display if not hidden */}
      {!hideHistoryButton && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Revenue Breakdown</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-pink-500 mb-4"></div>
            </div>
          ) : error ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Error loading chart data</p>
            </div>
          ) : transactions.length === 0 ? (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <BarChart2 size={48} className="text-gray-300" />
              <p className="ml-4 text-gray-500">No transaction data available for this date</p>
            </div>
          ) : (
            <RevenueChart transactions={transactions} tableHeaders={tableHeaders} />
          )}
        </div>
      )}

<AnimatePresence>
        {showHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-gray-800">Transaction History</h3>
                  <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowHistoryModal(false)}>
                    <X size={24} />
                  </button>
                </div>

                <div className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Search all transactions..."
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent w-full"
                      value={historySearchTerm}
                      onChange={(e) => setHistorySearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {tableHeaders.map((header) => (
                          <th
                            key={`history-${header.id}`}
                            scope="col"
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {header.label}
                          </th>
                        ))}
                        <th
                          key="history-actions"
                          scope="col"
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHistoryTransactions.length > 0 ? (
                        filteredHistoryTransactions.map((transaction) => (
                          <tr key={`history-row-${transaction._id}`} className="hover:bg-gray-50">
                            {tableHeaders.map((header) => {
                              // Special handling for price/amount fields
                              if (
                                (header.label.toLowerCase().includes("amount") ||
                                  header.label.toLowerCase().includes("price") ||
                                  header.label.toLowerCase().includes("commission") ||
                                  header.label.toLowerCase().includes("total")) &&
                                !header.label.toLowerCase().includes("serial") &&
                                !header.label.toLowerCase().includes("sr") &&
                                !header.label.toLowerCase().includes("no") &&
                                header.type !== "string"
                              ) {
                                const value = transaction[header.id]
                                let displayValue = value

                                if (!isNaN(Number.parseFloat(value))) {
                                  displayValue = "₹" + Number.parseFloat(value).toFixed(2)
                                }

                                return (
                                  <td key={`history-cell-${header.id}`} className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-green-600">{displayValue || "—"}</div>
                                  </td>
                                )
                              }

                              // For date fields
                              if (header.type === "date" || header.label.toLowerCase().includes("date")) {
                                // Use our formatDateForDisplay helper for consistent formatting
                                const displayDate = formatDateForDisplay(transaction[header.id])

                                return (
                                  <td key={`history-cell-${header.id}`} className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{displayDate}</div>
                                  </td>
                                )
                              }

                              // Default rendering for other columns
                              return (
                                <td key={`history-cell-${header.id}`} className="px-6 py-4 whitespace-nowrap">
                                  <div className="text-sm text-gray-900">{transaction[header.id] || "—"}</div>
                                </td>
                              )
                            })}
                            {/* Add Edit button to history items */}
                            <td key="history-actions-cell" className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                className="text-pink-600 hover:text-pink-900"
                                onClick={() => {
                                  handleEditClick(transaction)
                                  setShowHistoryModal(false)
                                }}
                              >
                                <Edit size={16} className="inline mr-1" />
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={tableHeaders.length + 1} className="px-6 py-4 text-center text-gray-500">
                            {historySearchTerm
                              ? "No transactions matching your search"
                              : "No transaction history found"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-6">
                  <button
                    type="button"
                    className="px-4 py-2 bg-pink-600 text-white rounded-md shadow-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                    onClick={() => setShowHistoryModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Notification popup - Enhanced with animation and icon */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            key="notification"
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg z-50 flex items-center ${
              notification.type === "success" ? "bg-green-100" : "bg-red-100"
            }`}
          >
            {notification.type === "success" ? (
              <CheckCircle2 className="text-green-600 mr-3" size={20} />
            ) : (
              <AlertCircle className="text-red-600 mr-3" size={20} />
            )}
            <p className={`font-medium ${
              notification.type === "success" ? "text-green-800" : "text-red-800"
            }`}>
              {notification.message}
            </p>
            <button 
              onClick={() => setNotification({ show: false, message: "", type: "" })}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Edit Form Modal - Updated with multi-select dropdown for extra services */}
      <AnimatePresence>
        {showEditForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-pink-600">Edit Transaction</h3>
                  <button 
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => setShowEditForm(false)}
                  >
                    <X size={24} />
                  </button>
                </div>
        
                <form onSubmit={handleEditSubmit} className="space-y-6"> 
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Check if user is staff, only show specific fields */}
                    {tableHeaders.map((header) => {
                      // For staff users, only show specific fields
                      if (user?.role === "staff") {
                        // Check if header label matches any of the allowed fields for staff
                        // Added "total amount" to the list
                        const allowedFields = [
                          "date", "booking id", "customer name", "service", 
                          "service price", "extra service", "extra service price", 
                          "totalamount", "status"
                        ];
                        
                        const headerLabel = header.label.toLowerCase();
                        const isAllowed = allowedFields.some(field => 
                          headerLabel.includes(field)
                        );
                        
                        if (!isAllowed) {
                          return null; // Don't render this field for staff
                        }
                      }
                      
                      // Render field normally for admins or allowed fields for staff
                      return (
                        <div key={`edit-${header.id}`}>
                          <label htmlFor={`edit-${header.id}`} className="block text-sm font-medium text-pink-700">
                            {header.label}
                          </label>
                          {renderFormField(header)}  
                        </div>
                      );
                    })}
                  </div>

                  {/* Discount Button and Mini Form */}
                  {!hideHistoryButton && (
                  <div className="col-span-full">
                    <div className="flex items-center justify-between mb-2 mt-2 pt-2 border-t border-gray-200">
                      <h4 className="text-md font-medium text-gray-700">Apply Discount</h4>
                      
                      {editingTransaction._appliedDiscount ? (
                        <div className="flex items-center">
                          <span className="text-green-600 mr-4">
                            {editingTransaction._appliedDiscount.code} discount applied: 
                            {editingTransaction._appliedDiscount.percentage}% 
                            (₹{editingTransaction._appliedDiscount.amount})
                          </span>
                          <button
                            type="button"
                            onClick={handleRemoveDiscount}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleAddDiscountClick}
                          className="px-3 py-1 bg-pink-100 text-pink-700 rounded-md hover:bg-pink-200 flex items-center"
                        >
                          <Plus size={16} className="mr-1" />
                          Add Discount
                        </button>
                      )}
                    </div>
                  </div>
                  )}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-pink-100">
                    <button
                      type="button"
                      className="px-4 py-2 border border-pink-300 rounded-md shadow-sm text-pink-700 bg-white hover:bg-pink-50 focus:outline-none focus:ring-2 focus:ring-pink-500"
                      onClick={() => setShowEditForm(false)}
                      disabled={submitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-pink-600 text-white rounded-md shadow-sm hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
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
                          Update Transaction
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Discount Form Modal - Place this outside of Edit Form Modal but inside the main component return */}
      {showDiscountForm && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Apply Promo Discount</h3>
              <button 
                onClick={handleCloseDiscountForm}
                className="text-gray-400 hover:text-gray-500"
              >
                <X size={20} />
              </button>
            </div>
            
            {loadingPromos ? (
              <div className="py-6 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-pink-500 mb-2"></div>
                <p className="text-gray-500">Loading promo cards...</p>
              </div>
            ) : promoCards.length === 0 ? (
              <div className="py-6 text-center bg-gray-50 rounded-md">
                <p className="text-gray-500">No promo cards available</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {promoCards.map(promo => (
                  <div 
                    key={promo.id}
                    onClick={() => handleSelectPromo(promo)}
                    className={`p-3 border rounded-md cursor-pointer transition-all ${
                      selectedPromo?.id === promo.id 
                        ? 'border-pink-500 bg-pink-50' 
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium text-gray-800">{promo.code}</h4>
                      <span className="text-pink-600 font-bold">{promo.discount}% off</span>
                    </div>
                    {promo.description && (
                      <p className="text-sm text-gray-500 mt-1">{promo.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {selectedPromo && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">Discount amount:</span>
                  <span className="font-medium">₹{discountAmount}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDiscountForm}
                  className="w-full mt-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700"
                >
                  Apply Discount
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Revenue Chart Component
const RevenueChart = ({ transactions, tableHeaders }) => {
  // Find field names in the data
  const amountField = tableHeaders.find(h => 
    h.label && (h.label.toLowerCase().includes('amount') || 
                h.label.toLowerCase().includes('price') || 
                h.label.toLowerCase().includes('revenue'))
  )?.id || 'amount'

  const serviceField = tableHeaders.find(h => 
    h.label && (h.label.toLowerCase().includes('service') || 
                h.label.toLowerCase().includes('item'))
  )?.id || 'service'

  // Process data for the chart - group transactions by service
  const serviceData = transactions.reduce((acc, transaction) => {
    const service = transaction[serviceField] || 'Other'
    const amount = parseFloat(transaction[amountField]) || 0
    
    if (!acc[service]) {
      acc[service] = {
        name: service,
        value: 0,
        count: 0
      }
    }
    
    acc[service].value += amount
    acc[service].count += 1
    
    return acc
  }, {})
  
  // Convert to array and sort by value (highest first)
  const chartData = Object.values(serviceData)
    .sort((a, b) => b.value - a.value)
    .map(item => ({
      name: item.name,
      revenue: parseFloat(item.value.toFixed(2)),
      count: item.count
    }))

  // Custom Tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded">
          <p className="font-bold">{label}</p>
          <p className="text-green-600">₹{payload[0].value.toFixed(2)} revenue</p>
          <p className="text-gray-600">{payload[1].value} services</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar yAxisId="left" dataKey="revenue" name="Revenue (₹)" fill="#8884d8" />
          <Bar yAxisId="right" dataKey="count" name="Number of Services" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export default DailyEntry