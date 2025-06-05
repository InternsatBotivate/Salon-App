"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "../Context/AuthContext.jsx"
import { useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Camera,
  Save,
  X,
  Mail,
  Phone,
  MapPin,
  Award,
  Calendar,
  Edit3,
  User,
  Shield,
  Plus,
  Users,
} from "lucide-react"

const ProfilePage = () => {
  const { user, updateUserProfile } = useAuth()
  const navigate = useNavigate()
  const [isEditing, setIsEditing] = useState(false)
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    profileImage: "",
    role: "",
    joinDate: "",
    bio: "",
    skills: [],
  })
  const [previewImage, setPreviewImage] = useState(null)
  const videoRef = useRef(null)
  const [newSkill, setNewSkill] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)

  // Enhanced Google Drive URL converter with multiple formats
  const convertGoogleDriveImageUrl = (originalUrl) => {
    if (!originalUrl || typeof originalUrl !== "string") {
      return null
    }

    // If it's not a Google Drive URL, return as is
    if (!originalUrl.includes("drive.google.com")) {
      return originalUrl
    }

    // Extract file ID from various Google Drive URL formats
    const fileIdMatch = originalUrl.match(/\/d\/([^/]+)|id=([^&]+)/)
    const fileId = fileIdMatch ? fileIdMatch[1] || fileIdMatch[2] : null

    if (!fileId) return originalUrl

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
    ]
  }

  // Component for images with fallback handling
  const ImgWithFallback = ({ src, alt, name }) => {
    const [imgSrc, setImgSrc] = useState(src)
    const [loadFailed, setLoadFailed] = useState(false)

    // Handle image load errors
    const handleError = () => {
      if (imgSrc === src) {
        // First failure - try to extract fileId and use a different format
        let fileId = null
        if (imgSrc.includes("drive.google.com") || imgSrc.includes("googleusercontent.com")) {
          const match = imgSrc.match(/\/d\/([^/&=]+)|id=([^&=]+)/)
          fileId = match ? match[1] || match[2] : null

          if (fileId) {
            // Try thumbnail format which often works with limited permissions
            setImgSrc(`https://drive.google.com/thumbnail?id=${fileId}&sz=w800`)
            return
          }
        }
        // If we can't extract a fileId or it's not a Google Drive URL
        setLoadFailed(true)
      } else {
        // Second failure - give up and use initials
        setLoadFailed(true)
      }
    }

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
        : "U"

      // Return a styled div with initials
      return (
        <div className="h-full w-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          <span className="text-white text-2xl font-bold">{initials}</span>
        </div>
      )
    }

    // Return the image with error handling
    return (
      <img
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        className="h-full w-full object-cover"
        onError={handleError}
        style={{ objectFit: "cover", width: "100%", height: "100%" }}
      />
    )
  }

  // Initialize form with user data from spreadsheet directly
  useEffect(() => {
    if (user) {
      // Initialize with minimal info while loading
      setProfileData({
        name: "",
        email: user.email || "",
        phone: "",
        address: "",
        // Use a data URL for the default image instead of via.placeholder.com
        profileImage:
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23f0f0f0'/%3E%3Ccircle cx='75' cy='60' r='30' fill='%23d1d1d1'/%3E%3Ccircle cx='75' cy='150' r='60' fill='%23d1d1d1'/%3E%3C/svg%3E",
        role: "",
        joinDate: "",
        bio: "",
        skills: [],
      })

      // Fetch all data from the spreadsheet
      fetchUserProfileData(user.email)
    }
  }, [user])

  // Function to fetch user profile data from the spreadsheet
  const fetchUserProfileData = async (userEmail) => {
    try {
      setIsLoading(true)

      // Use the specific sheet details provided
      const sheetId = "1zEik6_I7KhRQOucBhk1FW_67IUEdcSfEHjCaR37aK_U"
      const sheetName = "Clients"

      console.log("Using Sheet ID:", sheetId)

      // Fetch the Clients sheet data
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`

      console.log(`Fetching profile data from: ${url}`)
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status}`)
      }

      // Extract the JSON part from the response
      const text = await response.text()
      const jsonStart = text.indexOf("{")
      const jsonEnd = text.lastIndexOf("}")
      const jsonString = text.substring(jsonStart, jsonEnd + 1)
      const data = JSON.parse(jsonString)

      // Process the client data
      if (!data.table || !data.table.rows) {
        throw new Error("Invalid client data format")
      }

      // Find the user's row by matching email (column C/index 2)
      const userRow = data.table.rows.find(
        (row) =>
          row.c && row.c[2] && row.c[2].v && row.c[2].v.toString().trim().toLowerCase() === userEmail.toLowerCase(),
      )

      if (userRow) {
        // Extract data from specific columns
        const extractValue = (index) => {
          return userRow.c[index] && userRow.c[index].v ? userRow.c[index].v.toString().trim() : ""
        }

        const fullName = extractValue(9)
        const email = extractValue(10)
        const phone = extractValue(11)
        const address = extractValue(12)
        const bio = extractValue(13)
        const skillsString = extractValue(14)
        const driveImageUrl = extractValue(15)
        const role = extractValue(8)

        // Parse skills from comma-separated string
        const skills = skillsString ? skillsString.split(",").map((skill) => skill.trim()) : []

        // Process the image URL (if any)
        let imageUrl = driveImageUrl

        // Convert Drive URL if present - but don't worry about preloading
        // Let the ImgWithFallback component handle the fallbacks
        if (driveImageUrl && driveImageUrl.includes("drive.google.com")) {
          const possibleUrls = convertGoogleDriveImageUrl(driveImageUrl)
          // Just use the first URL from the list - fallbacks will be handled by the component
          imageUrl = Array.isArray(possibleUrls) ? possibleUrls[0] : possibleUrls
          console.log("Using image URL:", imageUrl)
        }

        // Update all profile data at once
        setProfileData((prev) => ({
          ...prev,
          name: fullName || prev.name,
          email: email || prev.email,
          phone: phone || prev.phone,
          address: address || prev.address,
          bio: bio || prev.bio,
          skills: skills.length > 0 ? skills : prev.skills,
          profileImage: imageUrl || prev.profileImage,
          role: role || prev.role,
        }))

        console.log("Profile data loaded successfully")
      } else {
        console.warn("User not found in the spreadsheet")
      }
    } catch (error) {
      console.error("Error fetching profile data:", error)
      setError("Failed to load profile data")
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Handle image upload
  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Check file size - restrict to 5MB
      if (file.size > 5 * 1024 * 1024) {
        alert("Image is too large. Please select an image under 5MB.")
        return
      }

      // Check file type
      if (!file.type.match("image.*")) {
        alert("Please select an image file")
        return
      }

      // Create a preview URL for the image
      const imageUrl = URL.createObjectURL(file)
      setPreviewImage(imageUrl)

      // Convert the file to base64 for upload to Google Drive
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onloadend = () => {
        const base64data = reader.result

        // Store base64 data to be sent to the server on save
        setProfileData((prev) => ({
          ...prev,
          profileImage: base64data,
        }))
      }
    }
  }

  // Add a new skill
  const addSkill = () => {
    if (newSkill.trim() && !profileData.skills.includes(newSkill.trim())) {
      setProfileData((prev) => ({
        ...prev,
        skills: [...prev.skills, newSkill.trim()],
      }))
      setNewSkill("")
    }
  }

  // Remove a skill
  const removeSkill = (skillToRemove) => {
    setProfileData((prev) => ({
      ...prev,
      skills: prev.skills.filter((skill) => skill !== skillToRemove),
    }))
  }

  // Handle form submission with spreadsheet update and CORS workaround
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // Create a unique iframe ID
      const iframeId = `submit-iframe-${Date.now()}`

      // Create a hidden iframe to target the form submission
      const iframe = document.createElement("iframe")
      iframe.name = iframeId
      iframe.id = iframeId
      iframe.style.display = "none"
      document.body.appendChild(iframe)

      // Use the specific script URL provided
      const scriptUrl =
        "https://script.google.com/macros/s/AKfycbz6-tMsYOC4lbu4XueMyMLccUryF9HkY7HZLC22FB9QeB5NxqCcxedWKS8drwgVwlM/exec"

      // Prepare form data for submission
      const formData = new FormData()

      // Add core profile data
      formData.append("action", "updateProfile")
      formData.append("email", user.email)
      formData.append("fullName", profileData.name)
      formData.append("emailAddress", profileData.email)
      formData.append("phone", profileData.phone)
      formData.append("address", profileData.address)
      formData.append("bio", profileData.bio)
      formData.append("skills", profileData.skills.join(","))

      // Handle profile image upload
      if (profileData.profileImage) {
        // Check if it's a new base64 image or an existing URL
        if (profileData.profileImage.startsWith("data:image")) {
          // New image upload
          formData.append("profileImage", profileData.profileImage)
          formData.append("isNewImage", "true")
        } else {
          // Existing image URL
          formData.append("profileImage", profileData.profileImage)
          formData.append("isNewImage", "false")
        }
      }

      // Create a form targeted at the iframe
      const form = document.createElement("form")
      form.method = "POST"
      form.action = scriptUrl
      form.target = iframeId // Target the hidden iframe

      // Add all form fields from formData
      for (const [key, value] of formData.entries()) {
        const input = document.createElement("input")
        input.type = "hidden"
        input.name = key
        input.value = value
        form.appendChild(input)
      }

      // Add form to body, submit it, then remove it
      document.body.appendChild(form)
      form.submit()

      // Set up a listener for iframe load completion
      iframe.onload = () => {
        try {
          // Try to get the response content from iframe if possible
          // (This might not work if the response is from a different origin)
          const iframeContent = iframe.contentDocument || iframe.contentWindow.document
          console.log("Response received in iframe", iframeContent.body.innerText)

          // Clean up the DOM
          setTimeout(() => {
            document.body.removeChild(form)
            document.body.removeChild(iframe)
          }, 100)

          // Update the user data in Auth context if available
          if (updateUserProfile) {
            updateUserProfile(profileData)
          }

          // Show success message
          alert("Profile updated successfully!")

          // Exit edit mode
          setIsEditing(false)

          // Refresh the data to show the updated profile
          fetchUserProfileData(user.email)
        } catch (error) {
          console.log("Couldn't access iframe content due to CORS, but form was submitted")

          // Even if we can't access the content, the form was submitted
          // Update the UI based on the assumption it succeeded
          if (updateUserProfile) {
            updateUserProfile(profileData)
          }

          alert("Profile updated successfully!")
          setIsEditing(false)
          fetchUserProfileData(user.email)
        } finally {
          setIsLoading(false)
        }
      }

      // Add a fallback timeout in case onload doesn't fire
      setTimeout(() => {
        if (isLoading) {
          // Clean up the DOM
          try {
            document.body.removeChild(form)
            document.body.removeChild(iframe)
          } catch (e) {
            console.log("Elements already removed")
          }

          // Update the UI
          if (updateUserProfile) {
            updateUserProfile(profileData)
          }

          alert("Profile update submitted!")
          setIsEditing(false)
          fetchUserProfileData(user.email)
          setIsLoading(false)
        }
      }, 5000)
    } catch (error) {
      // Log the full error for debugging
      console.error("Error updating profile:", error)

      // Set user-friendly error message
      setError(
        error.message.includes("Failed to upload image")
          ? "Image upload failed. Please try a smaller image."
          : "Failed to update profile. Please try again later.",
      )
      setIsLoading(false)
    }
  }

  // Go back to dashboard
  const goBack = () => {
    navigate("/admin-dashboard")
  }

  // Cancel editing
  const cancelEditing = () => {
    // Reset form data to current data from spreadsheet
    fetchUserProfileData(user.email)
    setPreviewImage(null)
    setIsEditing(false)
  }

  // Navigate to staff management page
  const navigateToStaffManagement = () => {
    navigate("/staff-management")
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Background Video */}
      <div className="absolute inset-0 z-0 opacity-20">
        <video ref={videoRef} autoPlay loop muted className="w-full h-full object-cover">
          <source
            src="https://assets.mixkit.co/videos/preview/mixkit-abstract-blue-liquid-10208-large.mp4"
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg transform rotate-6"></div>
              <div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-indigo-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M7 8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8C17 10.7614 14.7614 13 12 13C9.23858 13 7 10.7614 7 8Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M5 21V19C5 16.7909 6.79086 15 9 15H15C17.2091 15 19 16.7909 19 19V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
            <h1 className="ml-4 text-3xl font-extrabold text-white">
              Salon<span className="text-indigo-300">Pro</span>
            </h1>
          </div>
          <p className="text-indigo-200 text-center max-w-2xl">
            Manage your professional profile and personal information in one place
          </p>
        </div>

        {/* Navigation and Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 bg-white/10 backdrop-blur-lg rounded-xl p-4">
          <button
            onClick={goBack}
            className="flex items-center text-white hover:text-indigo-200 transition-colors mb-4 sm:mb-0"
          >
            <ArrowLeft size={20} className="mr-1" />
            <span>Back to Dashboard</span>
          </button>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Staff Management Button */}
            {profileData.role === "admin" && (
              <button
                onClick={navigateToStaffManagement}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-purple-500/30 flex items-center justify-center"
              >
                <Users size={18} className="mr-2" />
                Staff Management
              </button>
            )}

            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
              >
                <Edit3 size={18} className="inline mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-3">
                <button
                  onClick={cancelEditing}
                  className="flex items-center px-4 py-2 border border-white/30 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={16} className="mr-1" />
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-indigo-500/30"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="h-5 w-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-1" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl transform transition-all hover:scale-[1.01]">
              <div className="relative">
                {/* Profile Header Background */}
                <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-600"></div>

                {/* Profile Image */}
                <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16">
                  <div className="relative">
                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg">
                      {previewImage ? (
                        // For preview images (newly selected files), just show the preview
                        <img
                          src={previewImage || "/placeholder.svg"}
                          alt={profileData.name || "User"}
                          className="h-full w-full object-cover"
                          style={{ objectFit: "cover", width: "100%", height: "100%" }}
                        />
                      ) : profileData.profileImage && !profileData.profileImage.startsWith("data:image/svg") ? (
                        // For actual profile images (not placeholders), use a more robust approach with fallbacks
                        <ImgWithFallback
                          src={profileData.profileImage}
                          alt={profileData.name || "User"}
                          name={profileData.name}
                        />
                      ) : (
                        // Default placeholder (already an SVG or no image)
                        <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                          <User size={40} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    {isEditing && (
                      <label className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full cursor-pointer">
                        <Camera size={24} className="text-white" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageChange}
                          ref={fileInputRef}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Info */}
              <div className="pt-20 pb-8 px-6 text-center">
                <h2 className="text-2xl font-bold text-white mb-1">{profileData.name}</h2>
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 mb-4">
                  <Shield size={14} className="mr-1" />
                  {profileData.role}
                </div>

                <div className="space-y-4 mt-6">
                  <div className="flex items-center text-indigo-100">
                    <Mail size={16} className="mr-2 text-indigo-300" />
                    <span>{profileData.email}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <Phone size={16} className="mr-2 text-indigo-300" />
                    <span>{profileData.phone}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <MapPin size={16} className="mr-2 text-indigo-300" />
                    <span>{profileData.address}</span>
                  </div>
                  <div className="flex items-center text-indigo-100">
                    <Calendar size={16} className="mr-2 text-indigo-300" />
                    <span>Joined {profileData.joinDate}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl mb-8">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <User size={20} className="mr-2 text-indigo-300" />
                  About Me
                </h3>

                {isEditing ? (
                  <textarea
                    name="bio"
                    value={profileData.bio}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                ) : (
                  <p className="text-indigo-100 leading-relaxed">{profileData.bio}</p>
                )}
              </div>
            </div>

            {/* Skills & Expertise - Now Editable */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl mb-8">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                  <Award size={20} className="mr-2 text-indigo-300" />
                  Skills & Expertise
                </h3>

                {isEditing ? (
                  <div>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {profileData.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/30 text-indigo-100 flex items-center"
                        >
                          <span>{skill}</span>
                          <button onClick={() => removeSkill(skill)} className="ml-2 text-indigo-200 hover:text-white">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex mt-4">
                      <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a new skill"
                        className="flex-1 px-4 py-2 bg-white/5 border border-indigo-300/30 rounded-l-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyPress={(e) => e.key === "Enter" && addSkill()}
                      />
                      <button
                        onClick={addSkill}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 transition-colors"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 rounded-full text-sm font-medium bg-indigo-500/20 text-indigo-100"
                      >
                        {skill}
                      </span>
                    ))}
                    {profileData.skills.length === 0 && (
                      <span className="text-indigo-200 italic">No skills added yet</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Personal Information Form */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden shadow-xl">
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <Edit3 size={20} className="mr-2 text-indigo-300" />
                  Personal Information
                </h3>

                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Name */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-200 mb-2">Full Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="name"
                          value={profileData.name}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-white px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg">
                          {profileData.name}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-200 mb-2">Email Address</label>
                      {isEditing ? (
                        <input
                          type="email"
                          name="email"
                          value={profileData.email}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-white px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg">
                          {profileData.email}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-200 mb-2">Phone Number</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="phone"
                          value={profileData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-white px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg">
                          {profileData.phone}
                        </p>
                      )}
                    </div>

                    {/* Role - Read only */}
                    <div>
                      <label className="block text-sm font-medium text-indigo-200 mb-2">Role</label>
                      <p className="text-white px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg">
                        {profileData.role}
                      </p>
                    </div>

                    {/* Address - Full width */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-indigo-200 mb-2">Address</label>
                      {isEditing ? (
                        <textarea
                          name="address"
                          value={profileData.address}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <p className="text-white px-4 py-3 bg-white/5 border border-indigo-300/30 rounded-lg">
                          {profileData.address}
                        </p>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="inline-flex items-center justify-center">
            <div className="h-px w-16 bg-indigo-300/30"></div>
            {/* <span className="mx-4 text-indigo-200 text-sm">Powered by Botivate</span> */}
            <a href="https://www.botivate.in/" target="_blank" rel="noopener noreferrer">
  <span className="mx-4 text-indigo-200 text-sm hover:text-blue-500">Powered by Botivate</span>
</a>

            <div className="h-px w-16 bg-indigo-300/30"></div>
          </div>
          <p className="mt-4 text-indigo-300/60 text-sm">© 2025 SalonPro. All rights reserved.</p>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes blob {
            0% {
              transform: translate(0px, 0px) scale(1);
            }
            33% {
              transform: translate(30px, -50px) scale(1.1);
            }
            66% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            100% {
              transform: translate(0px, 0px) scale(1);
            }
          }
          .animate-blob {
            animation: blob 7s infinite;
          }
          .animation-delay-2000 {
            animation-delay: 2s;
          }
          .animation-delay-4000 {
            animation-delay: 4s;
          }
        `,
        }}
      ></style>
    </div>
  )
}

export default ProfilePage
