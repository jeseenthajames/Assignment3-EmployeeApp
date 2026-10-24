// Task1: initiate app and run server at 3000
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables from .env file (checks local dir and workspace root)
dotenv.config({ path: require('path').resolve(__dirname, '.env') });
if (!process.env.MONGODB_URI) {
    dotenv.config({ path: require('path').resolve(process.cwd(), '.env'), override: true });
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const path=require('path');
app.use(express.static(path.join(__dirname+'/dist/FrontEnd')));
app.use(express.static(path.join(__dirname, 'dist', 'Frontend')));

// Task2: create mongoDB connection 
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.warn('[Warning] MONGODB_URI is not set. Please configure MONGODB_URI in your .env file.');
} else {
    mongoose.connect(MONGODB_URI)
        .then(() => {
            console.log('Connected to MongoDB Atlas successfully.');
        })
        .catch((err) => {
            console.error('MongoDB Atlas connection error:', err.message);
        });
}

// Employee Schema & Model
const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
    },
    position: {
        type: String,
        required: [true, 'Position is required'],
        trim: true
    },
    salary: {
        type: Number,
        required: [true, 'Salary is required']
    }
}, {
    versionKey: false
});

const Employee = mongoose.model('Employee', employeeSchema, 'employees');

//Task 2 : write api with error handling and appropriate api mentioned in the TODO below

// Helper to check database connectivity
const checkDbConnection = (req, res, next) => {
    // Return 503 only if MONGODB_URI is missing or database is completely disconnected
    if (!process.env.MONGODB_URI || (mongoose.connection.readyState === 0 && !mongoose.connection._hasOpened)) {
        return res.status(503).json({
            error: 'Database unavailable',
            message: 'Not connected to MongoDB Atlas. Please ensure MONGODB_URI is properly configured in .env.'
        });
    }
    next();
};

//TODO: get data from db  using api '/api/employeelist'
app.get('/api/employeelist', checkDbConnection, async (req, res) => {
    try {
        const employees = await Employee.find();
        res.status(200).json(employees);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Failed to retrieve employees', message: err.message });
    }
});

//TODO: get single data from db  using api '/api/employeelist/:id'
app.get('/api/employeelist/:id', checkDbConnection, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid employee ID format' });
        }

        const employee = await Employee.findById(id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json(employee);
    } catch (err) {
        console.error('Error fetching employee:', err);
        res.status(500).json({ error: 'Failed to retrieve employee', message: err.message });
    }
});

//TODO: send data from db using api '/api/employeelist'
//Request body format:{name:'',location:'',position:'',salary:''}
app.post('/api/employeelist', checkDbConnection, async (req, res) => {
    try {
        const { name, location, position, salary } = req.body;

        if (!name || !location || !position || salary === undefined || salary === null || salary === '') {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'All fields (name, location, position, salary) are required'
            });
        }

        const numericSalary = Number(salary);
        if (isNaN(numericSalary)) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Salary must be a valid number'
            });
        }

        const newEmployee = new Employee({
            name: String(name).trim(),
            location: String(location).trim(),
            position: String(position).trim(),
            salary: numericSalary
        });

        const savedEmployee = await newEmployee.save();
        res.status(201).json(savedEmployee);
    } catch (err) {
        console.error('Error adding employee:', err);
        res.status(500).json({ error: 'Failed to add employee', message: err.message });
    }
});

//TODO: delete a employee data from db by using api '/api/employeelist/:id'
app.delete('/api/employeelist/:id', checkDbConnection, async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid employee ID format' });
        }

        const deletedEmployee = await Employee.findByIdAndDelete(id);
        if (!deletedEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json({
            message: 'Employee deleted successfully',
            employee: deletedEmployee
        });
    } catch (err) {
        console.error('Error deleting employee:', err);
        res.status(500).json({ error: 'Failed to delete employee', message: err.message });
    }
});

//TODO: Update  a employee data from db by using api '/api/employeelist'
//Request body format:{name:'',location:'',position:'',salary:''}
const handleUpdateEmployee = async (req, res) => {
    try {
        // ID can be passed in URL parameter (:id) or request body (_id or id) from the frontend
        const id = req.params.id || req.body._id || req.body.id;

        if (!id) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Employee ID is required for updating employee data'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid employee ID format' });
        }

        const { name, location, position, salary } = req.body;
        const updateData = {};

        if (name !== undefined) updateData.name = String(name).trim();
        if (location !== undefined) updateData.location = String(location).trim();
        if (position !== undefined) updateData.position = String(position).trim();
        if (salary !== undefined && salary !== null && salary !== '') {
            const numericSalary = Number(salary);
            if (isNaN(numericSalary)) {
                return res.status(400).json({
                    error: 'Validation failed',
                    message: 'Salary must be a valid number'
                });
            }
            updateData.salary = numericSalary;
        }

        const updatedEmployee = await Employee.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedEmployee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.status(200).json(updatedEmployee);
    } catch (err) {
        console.error('Error updating employee:', err);
        res.status(500).json({ error: 'Failed to update employee', message: err.message });
    }
};

// Supports both PUT /api/employeelist (as sent by existing frontend) and PUT /api/employeelist/:id (REST standard)
app.put('/api/employeelist', checkDbConnection, handleUpdateEmployee);
app.put('/api/employeelist/:id', checkDbConnection, handleUpdateEmployee);

// Handle unknown API routes (return JSON 404 instead of falling through to frontend index.html)
app.all('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

//! dont delete this code. it connects the front end file.
app.get('/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/dist/Frontend/index.html'));
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Run server at port 3000 or process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
