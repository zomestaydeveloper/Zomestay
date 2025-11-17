const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const UserDetailsController = {
  /**
   * Get user profile
   * GET /api/users/profile
   * Requires: Authentication (user role)
   */
  getUserProfile: async (req, res) => {
    try {
      // Get user ID from token (set by extractRole middleware)
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User not authenticated'
        });
      }

      // Fetch user from database
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          phone: true,
          firstname: true,
          lastname: true,
          profileImage: true,
          emailVerified: true,
          phoneVerified: true,
          dob: true,
          gender: true,
          city: true,
          state: true,
          country: true,
          zipcode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Format response
      const profile = {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim() || 'User',
        firstname: user.firstname || '',
        lastname: user.lastname || '',
        email: user.email,
        phone: user.phone || '',
        profileImage: user.profileImage || '',
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        dob: user.dob,
        gender: user.gender || '',
        city: user.city || '',
        state: user.state || '',
        country: user.country || '',
        zipcode: user.zipcode || '',
        status: user.status,
        joined: new Date(user.createdAt).getFullYear(),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: 'User profile retrieved successfully',
        data: profile
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching user profile',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  },

  /**
   * Update user profile
   * PUT /api/users/profile
   * Requires: Authentication (user role)
   * Body: { firstname?, lastname?, profileImage?, gender?, dob? }
   */
  updateUserProfile: async (req, res) => {
    try {
      // Get user ID from token
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User not authenticated'
        });
      }

      // Handle file upload if provided
      let profileImageUrl = null;
      if (req.file) {
        // File was uploaded via multer
        profileImageUrl = req.file.url || `/uploads/${req.file.subdirectory || 'images'}/${req.file.filename}`;
      }

      // Extract allowed fields from body (for non-file fields)
      const {
        firstname,
        lastname,
        gender,
        dob,
        city,
        state,
        country,
        zipcode,
      } = req.body;

      // Prepare update data (only include provided fields)
      const updateData = {};
      if (firstname !== undefined) updateData.firstname = firstname || null;
      if (lastname !== undefined) updateData.lastname = lastname || null;
      if (profileImageUrl !== null) updateData.profileImage = profileImageUrl;
      if (gender !== undefined) updateData.gender = gender || null;
      if (dob !== undefined) updateData.dob = dob ? new Date(dob) : null;
      if (city !== undefined) updateData.city = city || null;
      if (state !== undefined) updateData.state = state || null;
      if (country !== undefined) updateData.country = country || null;
      if (zipcode !== undefined) updateData.zipcode = zipcode || null;

      // Update user profile
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          email: true,
          phone: true,
          firstname: true,
          lastname: true,
          profileImage: true,
          emailVerified: true,
          phoneVerified: true,
          dob: true,
          gender: true,
          city: true,
          state: true,
          country: true,
          zipcode: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      });

      // Format response
      const profile = {
        id: updatedUser.id,
        name: `${updatedUser.firstname || ''} ${updatedUser.lastname || ''}`.trim() || 'User',
        firstname: updatedUser.firstname || '',
        lastname: updatedUser.lastname || '',
        email: updatedUser.email,
        phone: updatedUser.phone || '',
        profileImage: updatedUser.profileImage || '',
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
        dob: updatedUser.dob,
        gender: updatedUser.gender || '',
        city: updatedUser.city || '',
        state: updatedUser.state || '',
        country: updatedUser.country || '',
        zipcode: updatedUser.zipcode || '',
        status: updatedUser.status,
        joined: new Date(updatedUser.createdAt).getFullYear(),
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };

      return res.status(200).json({
        success: true,
        message: 'User profile updated successfully',
        data: profile
      });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error updating user profile',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  },

  /**
   * Delete user account (soft delete)
   * DELETE /api/users/profile
   * Requires: Authentication (user role)
   */
  deleteUserProfile: async (req, res) => {
    try {
      // Get user ID from token
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized: User not authenticated'
        });
      }

      // Soft delete user (set isDeleted = true)
      await prisma.user.update({
        where: { id: userId },
        data: {
          isDeleted: true,
          status: 'INACTIVE'
        }
      });

      return res.status(200).json({
        success: true,
        message: 'User account deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting user profile:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deleting user profile',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      });
    }
  }
};

module.exports = UserDetailsController;

