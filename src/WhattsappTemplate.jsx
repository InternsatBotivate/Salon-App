"use client"

import { useState, useEffect } from "react"
import { useAuth } from "./Context/AuthContext"
import { MessageSquare, Plus, Edit, Trash2, Save, X, Search, CheckCircle, AlertCircle } from "lucide-react"

const WhatsappTemplate = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [templates, setTemplates] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  // Updated newTemplate state without type field
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    message: "",
    footer: "",
    image: null,
    variables: {
      name: "",
      phone: "",
      email: "",
      address: "",
    },
  })
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [previewImage, setPreviewImage] = useState(null)

  // Add these new states for delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState(null)

  // Add these new states for variable insertion
  const [messageInputRef, setMessageInputRef] = useState(null)
  const [footerInputRef, setFooterInputRef] = useState(null)
  const [showVariableDropdown, setShowVariableDropdown] = useState(false)
  const [variableTarget, setVariableTarget] = useState("message") // "message" or "footer"

  // Google Sheet Details
  const sheetId = user?.sheetId || "1ghSQ9d2dfSotfnh8yrkiqIT00kg_ej7n0pnygzP0B9w"
  const scriptUrl =
    user?.appScriptUrl ||
    "https://script.google.com/macros/s/AKfycbx-5-79dRjYuTIBFjHTh3_Q8WQa0wWrRKm7ukq5854ET9OCHiAwno-gL1YmZ9juotMH/exec"
  const sheetName = "Whatsapp Temp"

  // Generate next template ID
  const generateNextTemplateId = () => {
    if (templates.length === 0) {
      return "temp-01"
    }
    
    // Find the highest template number
    const templateNumbers = templates
      .map(template => {
        const match = template.id.match(/temp-(\d+)/)
        return match ? parseInt(match[1]) : 0
      })
      .filter(num => num > 0)
    
    const maxNumber = templateNumbers.length > 0 ? Math.max(...templateNumbers) : 0
    const nextNumber = maxNumber + 1
    
    return `temp-${nextNumber.toString().padStart(2, '0')}`
  }

  // Function to combine message and footer WITHOUT replacing variables (keep placeholders)
  const combineMessageAndFooterForStorage = (message, footer) => {
    // Format text but DON'T replace variables - keep them as {name}, {phone}, etc.
    const formattedMessage = formatTextForSheet(message)
    const formattedFooter = formatTextForSheet(footer)

    if (!formattedFooter) {
      return formattedMessage
    }

    // Combine message and footer with natural line breaks (like WhatsApp)
    return `${formattedMessage}\n\n${formattedFooter}`
  }

  // Function to combine message and footer WITH variable replacement (for preview only)
  const combineMessageAndFooterForPreview = (message, footer, variables = {}) => {
    // Replace variables in both message and footer to get the final formatted text
    const formattedMessage = replaceVariables(formatTextForSheet(message), variables)
    const formattedFooter = replaceVariables(formatTextForSheet(footer), variables)

    if (!formattedFooter) {
      return formattedMessage
    }

    // Combine message and footer with natural line breaks (like WhatsApp)
    return `${formattedMessage}\n\n${formattedFooter}`
  }

  // Function to parse combined message and footer from sheet
  const parseMessageAndFooter = (combinedText) => {
    if (!combinedText) {
      return { message: "", footer: "" }
    }

    // Try to split by double line break (natural separator)
    const parts = combinedText.split("\n\n")

    if (parts.length >= 2) {
      // Last part is footer, everything else is message
      const footer = parts[parts.length - 1]
      const message = parts.slice(0, -1).join("\n\n")
      return {
        message: message.trim(),
        footer: footer.trim(),
      }
    } else {
      // If no double line break found, treat entire text as message
      return {
        message: combinedText.trim(),
        footer: "",
      }
    }
  }

  // Fetch templates from Google Sheet
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true)
        console.log("Fetching WhatsApp templates from sheet:", sheetName)

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
          console.log("No data found in the sheet")
          setTemplates([])
          setLoading(false)
          return
        }

        let headers = []
        let allRows = data.table.rows || []

        if (data.table.cols && data.table.cols.some((col) => col.label)) {
          headers = data.table.cols.map((col, index) => ({
            id: `col${index}`,
            label: col.label || `Column ${index + 1}`,
            type: col.type || "string",
            originalIndex: index,
          }))
        } else if (allRows.length > 0 && allRows[0].c && allRows[0].c.some((cell) => cell && cell.v)) {
          headers = allRows[0].c.map((cell, index) => ({
            id: `col${index}`,
            label: cell && cell.v ? String(cell.v) : `Column ${index + 1}`,
            type: data.table.cols[index]?.type || "string",
            originalIndex: index,
          }))
          allRows = allRows.slice(1)
        }

        // Updated column indexes - message and footer combined in one column
        const idIndex = 0 // Column A - ID
        const nameIndex = 1 // Column B - Template Name
        const messageIndex = 2 // Column C - Combined Message and Footer
        const createdAtIndex = 3 // Column D - Created At
        const deletedIndex = 4 // Column E - Delete flag
        const imageUrlIndex = 5 // Column F - Image URL

        const templatesData = allRows
          .filter((row) => {
            // Skip deleted templates
            const isDeleted =
              row.c && row.c.length > deletedIndex && row.c[deletedIndex] && row.c[deletedIndex].v === "Yes"
            return !isDeleted && row.c && row.c.some((cell) => cell && cell.v)
          })
          .map((row, rowIndex) => {
            const templateData = {
              _rowIndex: rowIndex + 2, // +2 because of header row and 1-indexed
            }

            // Extract data from each cell
            if (row.c && row.c[idIndex] && row.c[idIndex].v) {
              templateData.id = String(row.c[idIndex].v)
            } else {
              templateData.id = `template-${Date.now()}-${rowIndex}`
            }

            if (row.c && row.c[nameIndex] && row.c[nameIndex].v) {
              templateData.name = String(row.c[nameIndex].v)
            } else {
              templateData.name = "Unnamed Template"
            }

            // Parse combined message and footer
            if (row.c && row.c[messageIndex] && row.c[messageIndex].v) {
              const combinedText = String(row.c[messageIndex].v)
              const parsed = parseMessageAndFooter(combinedText)
              templateData.message = parsed.message
              templateData.footer = parsed.footer
            } else {
              templateData.message = ""
              templateData.footer = ""
            }

            if (row.c && row.c[createdAtIndex] && row.c[createdAtIndex].v) {
              if (row.c[createdAtIndex].v.toString().indexOf("Date") === 0) {
                const dateString = row.c[createdAtIndex].v.toString()
                const dateParts = dateString.substring(5, dateString.length - 1).split(",")

                if (dateParts.length >= 3) {
                  const year = Number.parseInt(dateParts[0])
                  const month = Number.parseInt(dateParts[1]) + 1
                  const day = Number.parseInt(dateParts[2])

                  // Format as DD/MM/YYYY
                  templateData.createdAt = `${day.toString().padStart(2, "0")}/${month.toString().padStart(2, "0")}/${year}`
                } else {
                  templateData.createdAt = String(row.c[createdAtIndex].v)
                }
              } else {
                templateData.createdAt = String(row.c[createdAtIndex].v)
              }
            } else {
              templateData.createdAt = new Date().toLocaleDateString("en-GB")
            }

            // Extract image URL if available
            if (row.c && row.c.length > imageUrlIndex && row.c[imageUrlIndex] && row.c[imageUrlIndex].v) {
              templateData.imageUrl = String(row.c[imageUrlIndex].v)
            } else {
              templateData.imageUrl = null
            }

            return templateData
          })

        console.log("Fetched templates:", templatesData)
        setTemplates(templatesData)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching templates:", error)
        setError("Failed to load WhatsApp templates")
        setLoading(false)
      }
    }

    fetchTemplates()
  }, [sheetId, sheetName])

  // Handle image upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setPreviewImage(e.target.result)
        setNewTemplate({ ...newTemplate, image: file })
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle editing image upload
  const handleEditImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setEditingTemplate({ ...editingTemplate, imagePreview: e.target.result, image: file })
      }
      reader.readAsDataURL(file)
    }
  }

  // Format text consistently for both message and footer
  const formatTextForSheet = (text) => {
    if (!text) return ""
    // Ensure consistent formatting - preserve line breaks and spacing
    return text.trim()
  }

  // Handle adding a new template
  // Replace the handleAddTemplate function with this updated version:
const handleAddTemplate = async (e) => {
  e.preventDefault()
  setSubmitting(true)

  try {
    // Generate next template ID
    const templateId = generateNextTemplateId()

    // Create a new template object
    const template = {
      id: templateId,
      name: newTemplate.name.trim(),
      message: formatTextForSheet(newTemplate.message),
      footer: formatTextForSheet(newTemplate.footer),
      createdAt: new Date().toLocaleDateString("en-GB"),
      imageUrl: previewImage,
      variables: newTemplate.variables,
    }

    // Combine message and footer for sheet storage WITHOUT replacing variables
    const combinedMessage = combineMessageAndFooterForStorage(template.message, template.footer)

    // Prepare data for Google Sheets with combined message and footer
    const templateData = [
      template.id,
      template.name,
      combinedMessage, // Combined message and footer in one column WITH variable placeholders
      template.createdAt,
      "No", // Not deleted
      "", // Image URL - will be filled by the server after upload
    ]

    console.log("Submitting template data:", templateData)

    // Send to Google Sheets
    const formData = new FormData()
    formData.append("sheetName", sheetName)
    formData.append("rowData", JSON.stringify(templateData))
    formData.append("action", "insert")

    // Add image data if present
    if (newTemplate.image) {
      // Convert image to base64
      const reader = new FileReader()
      const imageBase64 = await new Promise((resolve) => {
        reader.onload = (e) => {
          const base64 = e.target.result.split(',')[1] // Remove data:image/jpeg;base64, prefix
          resolve(base64)
        }
        reader.readAsDataURL(newTemplate.image)
      })

      formData.append("imageFile", imageBase64)
      formData.append("imageMimeType", newTemplate.image.type)
      formData.append("imageFileName", newTemplate.image.name)
    }

    const response = await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    })

    console.log("Template submitted to Google Sheets")

    // Add to templates list in UI (image URL will be updated when sheet is refetched)
    setTemplates([{ ...template, _rowIndex: 2 }, ...templates.map((t) => ({ ...t, _rowIndex: t._rowIndex + 1 }))])

    // Reset form and close it
    setNewTemplate({
      name: "",
      message: "",
      footer: "",
      image: null,
      variables: {
        name: "",
      },
    })
    setPreviewImage(null)
    setShowAddForm(false)

    // Show success notification
    setNotification({
      show: true,
      message: "Template added successfully!",
      type: "success",
    })

    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" })
    }, 3000)
  } catch (error) {
    console.error("Error adding template:", error)

    // Show error notification
    setNotification({
      show: true,
      message: `Failed to add template: ${error.message}`,
      type: "error",
    })

    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" })
    }, 5000)
  } finally {
    setSubmitting(false)
  }
}

// Replace the handleUpdateTemplate function with this updated version:
const handleUpdateTemplate = async (e) => {
  e.preventDefault()
  setSubmitting(true)

  try {
    const rowIndex = editingTemplate._rowIndex

    if (!rowIndex) {
      throw new Error("Could not determine the row index for updating this template")
    }

    // Combine message and footer for sheet storage WITHOUT replacing variables
    const combinedMessage = combineMessageAndFooterForStorage(editingTemplate.message, editingTemplate.footer)

    // Prepare data for Google Sheets with combined message and footer
    const templateData = [
      editingTemplate.id,
      editingTemplate.name.trim(),
      combinedMessage, // Combined message and footer in one column WITH variable placeholders
      editingTemplate.createdAt,
      "No", // Not deleted
      editingTemplate.imagePreview || editingTemplate.imageUrl || "", // Image URL
      JSON.stringify(editingTemplate.variables), // Variables as JSON
    ]

    console.log("Updating template data:", templateData)

    // Send to Google Sheets
    const formData = new FormData()
    formData.append("sheetName", sheetName)
    formData.append("rowData", JSON.stringify(templateData))
    formData.append("rowIndex", rowIndex)
    formData.append("action", "update")

    // Add image data if new image is selected
    if (editingTemplate.image) {
      // Convert image to base64
      const reader = new FileReader()
      const imageBase64 = await new Promise((resolve) => {
        reader.onload = (e) => {
          const base64 = e.target.result.split(',')[1] // Remove data:image/jpeg;base64, prefix
          resolve(base64)
        }
        reader.readAsDataURL(editingTemplate.image)
      })

      formData.append("imageFile", imageBase64)
      formData.append("imageMimeType", editingTemplate.image.type)
      formData.append("imageFileName", editingTemplate.image.name)
    }

    await fetch(scriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    })

    console.log("Template update submitted to Google Sheets")

    // Update the template in the list
    const updatedTemplates = templates.map((template) =>
      template.id === editingTemplate.id
        ? {
            ...editingTemplate,
            message: formatTextForSheet(editingTemplate.message),
            footer: formatTextForSheet(editingTemplate.footer),
            imageUrl: editingTemplate.imagePreview || editingTemplate.imageUrl,
          }
        : template,
    )

    setTemplates(updatedTemplates)
    setShowEditForm(false)

    // Show success notification
    setNotification({
      show: true,
      message: "Template updated successfully!",
      type: "success",
    })

    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" })
    }, 3000)
  } catch (error) {
    console.error("Error updating template:", error)

    // Show error notification
    setNotification({
      show: true,
      message: `Failed to update template: ${error.message}`,
      type: "error",
    })

    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" })
    }, 5000)
  } finally {
    setSubmitting(false)
  }
}

  // Handle editing a template
  const handleEditClick = (template) => {
    setEditingTemplate({
      ...template,
      imagePreview: template.imageUrl,
      footer: template.footer || "",
      variables: template.variables || {
        name: "",
        phone: "",
        email: "",
        address: "",
      },
    })
    setShowEditForm(true)
  }

  // Handle updating a template
  // const handleUpdateTemplate = async (e) => {
  //   e.preventDefault()
  //   setSubmitting(true)

  //   try {
  //     const rowIndex = editingTemplate._rowIndex

  //     if (!rowIndex) {
  //       throw new Error("Could not determine the row index for updating this template")
  //     }

  //     // Combine message and footer for sheet storage WITHOUT replacing variables
  //     const combinedMessage = combineMessageAndFooterForStorage(editingTemplate.message, editingTemplate.footer)

  //     // Prepare data for Google Sheets with combined message and footer
  //     const templateData = [
  //       editingTemplate.id,
  //       editingTemplate.name.trim(),
  //       combinedMessage, // Combined message and footer in one column WITH variable placeholders
  //       editingTemplate.createdAt,
  //       "No", // Not deleted
  //       editingTemplate.imagePreview || editingTemplate.imageUrl || "", // Image URL
  //       JSON.stringify(editingTemplate.variables), // Variables as JSON
  //     ]

  //     console.log("Updating template data:", templateData)

  //     // Send to Google Sheets
  //     const formData = new FormData()
  //     formData.append("sheetName", sheetName)
  //     formData.append("rowData", JSON.stringify(templateData))
  //     formData.append("rowIndex", rowIndex)
  //     formData.append("action", "update")

  //     await fetch(scriptUrl, {
  //       method: "POST",
  //       mode: "no-cors",
  //       body: formData,
  //     })

  //     console.log("Template update submitted to Google Sheets")

  //     // Update the template in the list
  //     const updatedTemplates = templates.map((template) =>
  //       template.id === editingTemplate.id
  //         ? {
  //             ...editingTemplate,
  //             message: formatTextForSheet(editingTemplate.message),
  //             footer: formatTextForSheet(editingTemplate.footer),
  //             imageUrl: editingTemplate.imagePreview || editingTemplate.imageUrl,
  //           }
  //         : template,
  //     )

  //     setTemplates(updatedTemplates)
  //     setShowEditForm(false)

  //     // Show success notification
  //     setNotification({
  //       show: true,
  //       message: "Template updated successfully!",
  //       type: "success",
  //     })

  //     setTimeout(() => {
  //       setNotification({ show: false, message: "", type: "" })
  //     }, 3000)
  //   } catch (error) {
  //     console.error("Error updating template:", error)

  //     // Show error notification
  //     setNotification({
  //       show: true,
  //       message: `Failed to update template: ${error.message}`,
  //       type: "error",
  //     })

  //     setTimeout(() => {
  //       setNotification({ show: false, message: "", type: "" })
  //     }, 5000)
  //   } finally {
  //     setSubmitting(false)
  //   }
  // }

  // Handle deleting a template (soft delete by marking deleted column)
  const handleDeleteClick = (template) => {
    setTemplateToDelete(template)
    setShowDeleteConfirm(true)
  }

  const handleDeleteTemplate = async () => {
    setSubmitting(true)

    try {
      if (!templateToDelete || !templateToDelete._rowIndex) {
        throw new Error("Could not determine the row index for deleting this template")
      }

      const rowIndex = templateToDelete._rowIndex

      // Find the delete column index (Column E = index 5)
      const deleteColumnIndex = 5

      // Send soft delete to Google Sheets
      const formData = new FormData()
      formData.append("sheetName", sheetName)
      formData.append("rowIndex", rowIndex)
      formData.append("action", "markDeleted")
      formData.append("columnIndex", deleteColumnIndex)
      formData.append("value", "Yes")

      await fetch(scriptUrl, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      })

      console.log("Template deleted in Google Sheets")

      // Update UI
      const updatedTemplates = templates.filter((template) => template.id !== templateToDelete.id)
      setTemplates(updatedTemplates)

      // Close the confirmation popup
      setShowDeleteConfirm(false)
      setTemplateToDelete(null)

      // Show success notification
      setNotification({
        show: true,
        message: "Template deleted successfully!",
        type: "success",
      })

      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 3000)
    } catch (error) {
      console.error("Error deleting template:", error)

      // Show error notification
      setNotification({
        show: true,
        message: `Failed to delete template: ${error.message}`,
        type: "error",
      })

      setTimeout(() => {
        setNotification({ show: false, message: "", type: "" })
      }, 5000)
    } finally {
      setSubmitting(false)
    }
  }

  // Filter templates based on search term
  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.footer && template.footer.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Update the replaceVariables function to handle both message and footer consistently
  const replaceVariables = (text, variables) => {
    let result = text || ""
    if (variables) {
      if (variables.name) result = result.replace(/\{name\}/gi, variables.name)
      if (variables.phone) result = result.replace(/\{phone\}/gi, variables.phone)
      if (variables.email) result = result.replace(/\{email\}/gi, variables.email)
      if (variables.address) result = result.replace(/\{address\}/gi, variables.address)
    }
    return result
  }

  // Function to get default variable values for preview only
  const getDefaultVariables = () => ({
    name: "John Doe",
    phone: "+1 234-567-8900",
    email: "john.doe@example.com",
    address: "123 Main Street, City, State 12345",
  })

  // Add this function to handle variable insertion
  const insertVariable = (variable) => {
    const inputRef = variableTarget === "message" ? messageInputRef : footerInputRef

    if (inputRef) {
      const start = inputRef.selectionStart
      const end = inputRef.selectionEnd

      if (variableTarget === "message") {
        const newMessage =
          newTemplate.message.substring(0, start) + `{${variable}}` + newTemplate.message.substring(end)

        setNewTemplate({ ...newTemplate, message: newMessage })
      } else {
        const newFooter = newTemplate.footer.substring(0, start) + `{${variable}}` + newTemplate.footer.substring(end)

        setNewTemplate({ ...newTemplate, footer: newFooter })
      }

      // Close dropdown after selection
      setShowVariableDropdown(false)
    }
  }

  // Add this function for editing template
  const insertEditVariable = (variable) => {
    const inputRef = variableTarget === "message" ? messageInputRef : footerInputRef

    if (inputRef && editingTemplate) {
      const start = inputRef.selectionStart
      const end = inputRef.selectionEnd

      if (variableTarget === "message") {
        const newMessage =
          editingTemplate.message.substring(0, start) + `{${variable}}` + editingTemplate.message.substring(end)

        setEditingTemplate({ ...editingTemplate, message: newMessage })
      } else {
        const newFooter =
          (editingTemplate.footer || "").substring(0, start) +
          `{${variable}}` +
          (editingTemplate.footer || "").substring(end)

        setEditingTemplate({ ...editingTemplate, footer: newFooter })
      }

      // Close dropdown after selection
      setShowVariableDropdown(false)
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">WhatsApp Templates</h2>

      {/* Search and Add Bar */}
      <div className="flex flex-col md:flex-row justify-between mb-6 gap-4">
        <div className="relative w-full md:w-64">
          <input
            type="text"
            placeholder="Search templates..."
            className="w-full pl-10 pr-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        </div>

        <button
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-300"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={18} />
          <span>Add Template</span>
        </button>
      </div>

      {/* Templates List */}
      <div className="bg-white rounded-md shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500 mb-4"></div>
            <p className="text-purple-600">Loading templates...</p>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Footer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Image
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <MessageSquare className="text-purple-600" size={20} />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{template.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">{template.message}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900 max-w-md truncate">
                          {template.footer || <span className="text-gray-400">No footer</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {template.imageUrl ? (
                          <div className="h-10 w-10 rounded-md overflow-hidden bg-gray-100">
                            <img
                              src={template.imageUrl || "/placeholder.svg"}
                              alt="Template"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No image</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.createdAt}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          className="text-purple-600 hover:text-purple-800 mr-3"
                          onClick={() => handleEditClick(template)}
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          onClick={() => handleDeleteClick(template)}
                          disabled={submitting}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No templates found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


      {/* Add Template Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-purple-800">Add New Template</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowAddForm(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleAddTemplate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-purple-700">
                        Template Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={newTemplate.name}
                        onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-purple-700">
                        Message Template
                      </label>
                      <div className="relative">
                        <textarea
                          id="message"
                          name="message"
                          rows={6}
                          value={newTemplate.message}
                          onChange={(e) => setNewTemplate({ ...newTemplate, message: e.target.value })}
                          className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                          placeholder="Type your message here..."
                          required
                          ref={(ref) => setMessageInputRef(ref)}
                          onClick={() => setVariableTarget("message")}
                        ></textarea>
                        <button
                          type="button"
                          className="absolute right-2 bottom-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200"
                          onClick={(e) => {
                            e.preventDefault()
                            setVariableTarget("message")
                            setShowVariableDropdown(!showVariableDropdown)
                          }}
                        >
                          Add Variable
                        </button>
                        {showVariableDropdown && variableTarget === "message" && (
                          <div className="absolute right-2 bottom-12 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                            <ul className="py-1">
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("name")}
                              >
                                Name
                              </li>
                              {/* <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("phone")}
                              >
                                Phone
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("email")}
                              >
                                Email
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("address")}
                              >
                                Address
                              </li> */}
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Use {"{name}"}, {"{phone}"}, {"{email}"}, {"{address}"} as placeholders for dynamic content.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="footer" className="block text-sm font-medium text-purple-700">
                        Footer Text
                      </label>
                      <div className="relative">
                        <textarea
                          id="footer"
                          name="footer"
                          rows={2}
                          value={newTemplate.footer}
                          onChange={(e) => setNewTemplate({ ...newTemplate, footer: e.target.value })}
                          className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                          placeholder="Add footer text here..."
                          ref={(ref) => setFooterInputRef(ref)}
                          onClick={() => setVariableTarget("footer")}
                        ></textarea>
                        {/* <button
                          type="button"
                          className="absolute right-2 bottom-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200"
                          onClick={(e) => {
                            e.preventDefault()
                            setVariableTarget("footer")
                            setShowVariableDropdown(!showVariableDropdown)
                          }}
                        >
                          Add Variable
                        </button> */}
                        {showVariableDropdown && variableTarget === "footer" && (
                          <div className="absolute right-2 bottom-12 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                            <ul className="py-1">
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("name")}
                              >
                                Name
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("phone")}
                              >
                                Phone
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("email")}
                              >
                                Email
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertVariable("address")}
                              >
                                Address
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Add a footer message like contact info or unsubscribe instructions.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="image" className="block text-sm font-medium text-purple-700">
                        Template Image
                      </label>
                      <div className="mt-1 flex items-center">
                        <label className="block w-full">
                          <span className="sr-only">Choose image</span>
                          <input
                            type="file"
                            id="image"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-purple-50 file:text-purple-700
                              hover:file:bg-purple-100"
                          />
                        </label>
                      </div>
                      {previewImage && (
                        <div className="mt-2">
                          <img
                            src={previewImage || "/placeholder.svg"}
                            alt="Preview"
                            className="h-32 w-auto object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>
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
                          Save Template
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Message Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Message Preview</h4>
                  <div className="bg-[#e5ddd5] p-4 rounded-lg h-[500px] overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                          W
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">WhatsApp Business</p>
                          <p className="text-xs text-gray-600">Online</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Received message */}
                      <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-[80%] shadow-sm">
                          <p className="text-gray-800">Hi, I'm interested in your products!</p>
                          <p className="text-xs text-gray-500 text-right">12:30 PM</p>
                        </div>
                      </div>

                      {/* Template message */}
                      <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-lg max-w-[80%] shadow-sm">
                          {previewImage && (
                            <div className="mb-2">
                              <img
                                src={previewImage || "/placeholder.svg"}
                                alt="Template"
                                className="rounded-lg max-h-48 w-auto"
                              />
                            </div>
                          )}
                          <p className="text-gray-800 whitespace-pre-line">
                            {replaceVariables(newTemplate.message, getDefaultVariables())}
                          </p>
                          {newTemplate.footer && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 whitespace-pre-line">
                                {replaceVariables(newTemplate.footer, getDefaultVariables())}
                              </p>
                            </div>
                          )}
                          {/* <p className="text-xs text-gray-500 text-right mt-1">12:31 PM</p> */}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    {/* <div className="mt-auto pt-4">
                      <div className="bg-white rounded-full flex items-center p-2">
                        <input
                          type="text"
                          placeholder="Type a message"
                          className="flex-1 border-0 focus:ring-0 text-sm"
                          disabled
                        />
                      </div>
                    </div> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Template Modal */}
      {showEditForm && editingTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-purple-800">Edit Template</h3>
                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowEditForm(false)}>
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <form onSubmit={handleUpdateTemplate} className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="edit-name" className="block text-sm font-medium text-purple-700">
                        Template Name
                      </label>
                      <input
                        type="text"
                        id="edit-name"
                        name="name"
                        value={editingTemplate.name}
                        onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="edit-message" className="block text-sm font-medium text-purple-700">
                        Message Template
                      </label>
                      <div className="relative">
                        <textarea
                          id="edit-message"
                          name="message"
                          rows={6}
                          value={editingTemplate.message}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, message: e.target.value })}
                          className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                          placeholder="Type your message here..."
                          required
                          ref={(ref) => setMessageInputRef(ref)}
                          onClick={() => setVariableTarget("message")}
                        ></textarea>
                        <button
                          type="button"
                          className="absolute right-2 bottom-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200"
                          onClick={(e) => {
                            e.preventDefault()
                            setVariableTarget("message")
                            setShowVariableDropdown(!showVariableDropdown)
                          }}
                        >
                          Add Variable
                        </button>
                        {showVariableDropdown && variableTarget === "message" && (
                          <div className="absolute right-2 bottom-12 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                            <ul className="py-1">
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("name")}
                              >
                                Name
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("phone")}
                              >
                                Phone
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("email")}
                              >
                                Email
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("address")}
                              >
                                Address
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Use {"{name}"}, {"{phone}"}, {"{email}"}, {"{address}"} as placeholders for dynamic content.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="edit-footer" className="block text-sm font-medium text-purple-700">
                        Footer Text
                      </label>
                      <div className="relative">
                        <textarea
                          id="edit-footer"
                          name="footer"
                          rows={2}
                          value={editingTemplate.footer || ""}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, footer: e.target.value })}
                          className="mt-1 block w-full rounded-md border-blue-300 shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-500 focus:ring-opacity-50"
                          placeholder="Add footer text here..."
                          ref={(ref) => setFooterInputRef(ref)}
                          onClick={() => setVariableTarget("footer")}
                        ></textarea>
                        <button
                          type="button"
                          className="absolute right-2 bottom-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-md text-sm hover:bg-purple-200"
                          onClick={(e) => {
                            e.preventDefault()
                            setVariableTarget("footer")
                            setShowVariableDropdown(!showVariableDropdown)
                          }}
                        >
                          Add Variable
                        </button>
                        {showVariableDropdown && variableTarget === "footer" && (
                          <div className="absolute right-2 bottom-12 bg-white shadow-lg rounded-md border border-gray-200 z-10">
                            <ul className="py-1">
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("name")}
                              >
                                Name
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("phone")}
                              >
                                Phone
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("email")}
                              >
                                Email
                              </li>
                              <li
                                className="px-4 py-2 hover:bg-purple-50 cursor-pointer"
                                onClick={() => insertEditVariable("address")}
                              >
                                Address
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-500">
                        Add a footer message like contact info or unsubscribe instructions.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="edit-image" className="block text-sm font-medium text-purple-700">
                        Template Image
                      </label>
                      <div className="mt-1 flex items-center">
                        <label className="block w-full">
                          <span className="sr-only">Choose image</span>
                          <input
                            type="file"
                            id="edit-image"
                            accept="image/*"
                            onChange={handleEditImageUpload}
                            className="block w-full text-sm text-gray-500
                              file:mr-4 file:py-2 file:px-4
                              file:rounded-md file:border-0
                              file:text-sm file:font-semibold
                              file:bg-purple-50 file:text-purple-700
                              hover:file:bg-purple-100"
                          />
                        </label>
                      </div>
                      {(editingTemplate.imagePreview || editingTemplate.imageUrl) && (
                        <div className="mt-2">
                          <img
                            src={editingTemplate.imagePreview || editingTemplate.imageUrl}
                            alt="Preview"
                            className="h-32 w-auto object-cover rounded-md"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4 border-t border-purple-100">
                    <button
                      type="button"
                      className="px-4 py-2 border border-purple-300 rounded-md shadow-sm text-purple-700 bg-white hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      onClick={() => setShowEditForm(false)}
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
                          Update Template
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Message Preview */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">Message Preview</h4>
                  <div className="bg-[#e5ddd5] p-4 rounded-lg h-[500px] overflow-auto">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold">
                          W
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">WhatsApp Business</p>
                          <p className="text-xs text-gray-600">Online</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {/* Received message */}
                      <div className="flex justify-end">
                        <div className="bg-[#dcf8c6] p-3 rounded-lg max-w-[80%] shadow-sm">
                          <p className="text-gray-800">Hi, I'm interested in your products!</p>
                          <p className="text-xs text-gray-500 text-right">12:30 PM</p>
                        </div>
                      </div>

                      {/* Template message */}
                      <div className="flex justify-start">
                        <div className="bg-white p-3 rounded-lg max-w-[80%] shadow-sm">
                          {(editingTemplate.imagePreview || editingTemplate.imageUrl) && (
                            <div className="mb-2">
                              <img
                                src={editingTemplate.imagePreview || editingTemplate.imageUrl}
                                alt="Template"
                                className="rounded-lg max-h-48 w-auto"
                              />
                            </div>
                          )}
                          <p className="text-gray-800 whitespace-pre-line">
                            {replaceVariables(editingTemplate.message, getDefaultVariables())}
                          </p>
                          {editingTemplate.footer && (
                            <div className="mt-2 pt-2 border-t border-gray-200">
                              <p className="text-xs text-gray-500 whitespace-pre-line">
                                {replaceVariables(editingTemplate.footer, getDefaultVariables())}
                              </p>
                            </div>
                          )}
                          <p className="text-xs text-gray-500 text-right mt-1">12:31 PM</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-auto pt-4">
                      <div className="bg-white rounded-full flex items-center p-2">
                        <input
                          type="text"
                          placeholder="Type a message"
                          className="flex-1 border-0 focus:ring-0 text-sm"
                          disabled
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && templateToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-red-100">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 text-red-600 mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Template</h3>
              <p className="text-gray-600">
                Are you sure you want to delete the template "{templateToDelete.name}"? This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <button
                type="button"
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors duration-200"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setTemplateToDelete(null)
                }}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-600 text-white rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-all duration-300 flex items-center"
                onClick={handleDeleteTemplate}
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
                    Delete Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-8 border-t pt-6 text-center text-gray-500 text-sm">
        <p>© {new Date().getFullYear()} WhatsApp Template Manager. All rights reserved.</p>
        <p className="mt-2">
          <a href="#" className="text-purple-600 hover:underline">
            Terms of Service
          </a>{" "}
          |
          <a href="#" className="text-purple-600 hover:underline ml-2">
            Privacy Policy
          </a>
        </p>
      </footer>

      {notification.show && (
        <div
          className={`fixed top-4 right-4 px-6 py-4 rounded-lg shadow-xl z-50 flex items-center ${
            notification.type === "success"
              ? "bg-green-100 text-green-800 border border-green-300"
              : "bg-red-100 text-red-800 border border-red-300"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 mr-3 text-red-600" />
          )}
          <p className="font-medium">{notification.message}</p>
          <button
            onClick={() => setNotification({ show: false, message: "", type: "" })}
            className="ml-4 text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

export default WhatsappTemplate
