
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

module.exports = async function travelAgentRegister(req,res){

    try {
         const {
        email,
        phone,
        password,
        firstName,
        lastName,
        agencyName,
        licenseNumber,
        officeAddress
      } = req.body;

      const iataCertificate = req.file ? req.file.url : null;

       if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingAgent = await prisma.travelAgent.findFirst({
      where: { email: normalizedEmail, isDeleted: false }
    });

    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'You already have an account with this email'
      });
    }


    if (phone) {
      const existingPhone = await prisma.travelAgent.findFirst({
        where: { phone, isDeleted: false }
      });

      if (existingPhone) {
        return res.status(400).json({
          success: false,
          message: 'Phone number already registered'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 12);


    const travelAgent = await prisma.travelAgent.create({
      data: {
        email: normalizedEmail,
        phone: phone || null,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        agencyName: agencyName || null,
        licenseNumber: licenseNumber || null,
        officeAddress: officeAddress || null,
        iataCertificate,
        status: 'pending'
      },
      select: {
        id: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Registered successfully. Pending admin approval.',
      data: travelAgent
    });
  
    } catch (error) {

     console.error('Register Error:', error);

    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        message: 'Duplicate field value'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  
        
    }

};