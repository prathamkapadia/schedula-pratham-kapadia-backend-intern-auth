import 'reflect-metadata';
import { AppDataSource } from './data-source';
import { User, Role } from './auth/user.entity';
import { DoctorProfile, SchedulingType } from './doctor/doctor-profile.entity';
import { RecurringAvailability, DayOfWeek } from './doctor/availability.entity';
import * as bcrypt from 'bcrypt';

const doctors: any[] = [
  {
    name: 'Dr. Rahul Kumar',
    email: 'rahul@test.com',
    specialization: 'Cardiologist',
    experienceYears: 10,
    qualification: 'MBBS, MD',
    consultationFee: 500,
    slotDuration: 45,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Experienced cardiologist',
    achievement: 'Gold Medalist',
    services: ['Heart Checkup', 'ECG', 'Consultation'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.FRIDAY, startTime: '14:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Dr. Lavangi Shah',
    email: 'lavangi@test.com',
    specialization: 'Gynaecologist',
    experienceYears: 15,
    qualification: 'MBBS, MS',
    consultationFee: 700,
    slotDuration: 60,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Senior gynaecologist',
    achievement: 'Gold Medalist',
    services: ['Pregnancy', 'New Born', 'New Mother'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.SATURDAY, startTime: '14:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Dr. Elango Raj',
    email: 'elango@test.com',
    specialization: 'Neurologist',
    experienceYears: 8,
    qualification: 'MBBS, DM',
    consultationFee: 600,
    slotDuration: 45,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Neurologist specialist',
    achievement: 'Best Doctor 2023',
    services: ['Headache', 'Epilepsy', 'Stroke'],
    availability: [
      { day: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.SATURDAY, startTime: '10:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Aisha Sharma',
    email: 'aisha.sharma@schedula.com',
    specialization: 'Dermatologist',
    experienceYears: 8,
    qualification: 'MBBS, MD Dermatology',
    consultationFee: 800,
    slotDuration: 30,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Expert in skin, hair and nail conditions.',
    achievement: 'Best Dermatologist Award 2023',
    services: ['Acne Treatment', 'Hair Loss', 'Skin Allergy'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.FRIDAY, startTime: '10:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Priya Nair',
    email: 'priya.nair@schedula.com',
    specialization: 'General Physician',
    experienceYears: 5,
    qualification: 'MBBS',
    consultationFee: 400,
    slotDuration: 15,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'General health consultations and preventive care.',
    achievement: '',
    services: ['Fever', 'Cold & Cough', 'General Checkup'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '09:00', endTime: '12:00' },
      { day: DayOfWeek.MONDAY, startTime: '16:00', endTime: '20:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '09:00', endTime: '12:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '16:00', endTime: '20:00' },
      { day: DayOfWeek.FRIDAY, startTime: '09:00', endTime: '12:00' },
      { day: DayOfWeek.FRIDAY, startTime: '16:00', endTime: '20:00' },
    ],
  },
  {
    name: 'Dr. Arjun Kapoor',
    email: 'arjun.kapoor@schedula.com',
    specialization: 'Cardiologist',
    experienceYears: 15,
    qualification: 'MBBS, MD, DM Cardiology',
    consultationFee: 1500,
    slotDuration: 45,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Heart specialist with 15 years experience.',
    achievement: 'Fellow of Cardiology Society of India',
    services: ['ECG', 'Heart Checkup', 'Hypertension'],
    availability: [
      { day: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.THURSDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.SATURDAY, startTime: '10:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Sneha Joshi',
    email: 'sneha.joshi@schedula.com',
    specialization: 'Paediatrician',
    experienceYears: 7,
    qualification: 'MBBS, MD Paediatrics',
    consultationFee: 600,
    slotDuration: 20,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Child health specialist.',
    achievement: '',
    services: ['Child Vaccination', 'Growth Monitoring', 'Child Nutrition'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '11:00', endTime: '14:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '11:00', endTime: '14:00' },
      { day: DayOfWeek.FRIDAY, startTime: '11:00', endTime: '14:00' },
      { day: DayOfWeek.SATURDAY, startTime: '10:00', endTime: '13:00' },
    ],
  },
  {
    name: 'Dr. Vikram Rao',
    email: 'vikram.rao@schedula.com',
    specialization: 'Orthopaedic',
    experienceYears: 10,
    qualification: 'MBBS, MS Orthopaedics',
    consultationFee: 900,
    slotDuration: 30,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Bone, joint and muscle specialist.',
    achievement: 'Best Orthopaedic Surgeon 2021',
    services: ['Fracture Care', 'Joint Pain', 'Sports Injury'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '16:00', endTime: '20:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '16:00', endTime: '20:00' },
      { day: DayOfWeek.FRIDAY, startTime: '16:00', endTime: '20:00' },
    ],
  },
  {
    name: 'Dr. Neha Gupta',
    email: 'neha.gupta@schedula.com',
    specialization: 'Psychiatrist',
    experienceYears: 9,
    qualification: 'MBBS, MD Psychiatry',
    consultationFee: 1000,
    slotDuration: 60,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Mental health and wellness specialist.',
    achievement: '',
    services: ['Anxiety', 'Depression', 'Stress Management'],
    availability: [
      { day: DayOfWeek.TUESDAY, startTime: '14:00', endTime: '18:00' },
      { day: DayOfWeek.THURSDAY, startTime: '14:00', endTime: '18:00' },
      { day: DayOfWeek.SATURDAY, startTime: '14:00', endTime: '18:00' },
    ],
  },
  {
    name: 'Dr. Pooja Singh',
    email: 'pooja.singh@schedula.com',
    specialization: 'Ophthalmologist',
    experienceYears: 6,
    qualification: 'MBBS, MS Ophthalmology',
    consultationFee: 700,
    slotDuration: 15,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Eye care and vision specialist.',
    achievement: '',
    services: ['Eye Test', 'Cataract', 'Glaucoma'],
    availability: [
      { day: DayOfWeek.TUESDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.TUESDAY, startTime: '16:00', endTime: '19:00' },
      { day: DayOfWeek.FRIDAY, startTime: '10:00', endTime: '13:00' },
      { day: DayOfWeek.FRIDAY, startTime: '16:00', endTime: '19:00' },
    ],
  },
  {
    name: 'Dr. Karan Malhotra',
    email: 'karan.malhotra@schedula.com',
    specialization: 'ENT Specialist',
    experienceYears: 4,
    qualification: 'MBBS, MS ENT',
    consultationFee: 500,
    slotDuration: 20,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Ear, nose and throat specialist.',
    achievement: '',
    services: ['Hearing Loss', 'Sinusitis', 'Tonsillitis'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '14:00', endTime: '18:00' },
      { day: DayOfWeek.WEDNESDAY, startTime: '14:00', endTime: '18:00' },
      { day: DayOfWeek.SATURDAY, startTime: '11:00', endTime: '15:00' },
    ],
  },

  // ── Day 9: Advanced scheduling demo doctors ──────────────────────────

  {
    name: 'Dr. Wave OPD',
    email: 'wave.opd@schedula.com',
    specialization: 'General Physician',
    experienceYears: 6,
    qualification: 'MBBS',
    consultationFee: 300,
    slotDuration: 30,
    schedulingType: SchedulingType.WAVE,
    bufferTime: 0,
    maxPatientsPerWave: 5,
    bio: 'High volume OPD — token based consultations.',
    achievement: '',
    services: ['General Checkup', 'OPD Consultation'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '11:00' },
    ],
  },
  {
    name: 'Dr. Wave Small',
    email: 'wave.small@schedula.com',
    specialization: 'Pediatrician',
    experienceYears: 4,
    qualification: 'MBBS, MD Pediatrics',
    consultationFee: 350,
    slotDuration: 30,
    schedulingType: SchedulingType.WAVE,
    bufferTime: 0,
    maxPatientsPerWave: 2,
    bio: 'Small wave window — easy to demo full capacity.',
    achievement: '',
    services: ['Child Checkup', 'Vaccination'],
    availability: [
      { day: DayOfWeek.TUESDAY, startTime: '16:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Dr. Wave Multi',
    email: 'wave.multi@schedula.com',
    specialization: 'ENT Specialist',
    experienceYears: 5,
    qualification: 'MBBS, MS ENT',
    consultationFee: 400,
    slotDuration: 30,
    schedulingType: SchedulingType.WAVE,
    bufferTime: 0,
    maxPatientsPerWave: 3,
    bio: 'Two wave windows in the same day.',
    achievement: '',
    services: ['ENT Checkup'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '11:00', endTime: '12:00' },
      { day: DayOfWeek.MONDAY, startTime: '16:00', endTime: '17:00' },
    ],
  },
  {
    name: 'Dr. Stream Derma',
    email: 'stream.derma@schedula.com',
    specialization: 'Dermatologist',
    experienceYears: 8,
    qualification: 'MBBS, MD Dermatology',
    consultationFee: 800,
    slotDuration: 15,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 5,
    maxPatientsPerWave: null,
    bio: 'Stream scheduling with 5 minute buffer between slots.',
    achievement: '',
    services: ['Skin Consultation'],
    availability: [
      { day: DayOfWeek.MONDAY, startTime: '10:00', endTime: '11:00' },
    ],
  },
  {
    name: 'Dr. Stream Psych',
    email: 'stream.psych@schedula.com',
    specialization: 'Psychologist',
    experienceYears: 7,
    qualification: 'MA Psychology, RCI Licensed',
    consultationFee: 600,
    slotDuration: 30,
    schedulingType: SchedulingType.STREAM,
    bufferTime: 0,
    maxPatientsPerWave: null,
    bio: 'Standard stream scheduling, no buffer.',
    achievement: '',
    services: ['Counselling', 'Therapy Session'],
    availability: [
      { day: DayOfWeek.WEDNESDAY, startTime: '10:00', endTime: '12:00' },
    ],
  },
];

async function seed() {
  await AppDataSource.initialize();
  console.log('✅ Database connected. Starting seed...\n');

  const userRepo = AppDataSource.getRepository(User);
  const profileRepo = AppDataSource.getRepository(DoctorProfile);
  const recurringRepo = AppDataSource.getRepository(RecurringAvailability);

  const password = await bcrypt.hash('Doctor@123', 10);

  for (const doc of doctors) {
    const existingUser = await userRepo.findOne({ where: { email: doc.email } });
    if (existingUser) {
      console.log(`⏭️  Skipping ${doc.name} — already exists`);
      continue;
    }

    // Create user
    const user = new User();
    user.name = doc.name;
    user.email = doc.email;
    user.password = password;
    user.role = Role.DOCTOR;
    const savedUser = await userRepo.save(user);

    // Create doctor profile
    const profile = new DoctorProfile();
    profile.userId = savedUser.id;
    profile.fullName = doc.name;
    profile.specialization = doc.specialization;
    profile.experienceYears = doc.experienceYears;
    profile.qualification = doc.qualification;
    profile.consultationFee = doc.consultationFee;
    profile.slotDuration = doc.slotDuration;
    profile.schedulingType = doc.schedulingType;
    profile.bufferTime = doc.bufferTime;
    profile.maxPatientsPerWave = doc.maxPatientsPerWave;
    profile.bio = doc.bio;
    profile.achievement = doc.achievement;
    profile.services = doc.services;
    profile.availability = [];
    profile.isAvailable = true;
    const savedProfile = await profileRepo.save(profile);

    // Create recurring availability
    for (const slot of doc.availability) {
      const recurring = new RecurringAvailability();
      recurring.doctorId = savedProfile.id;
      recurring.dayOfWeek = slot.day;
      recurring.startTime = slot.startTime;
      recurring.endTime = slot.endTime;
      await recurringRepo.save(recurring);
    }

    const typeLabel =
      doc.schedulingType === SchedulingType.WAVE
        ? `WAVE, max ${doc.maxPatientsPerWave}/window`
        : `STREAM, ${doc.slotDuration} min${doc.bufferTime ? ` + ${doc.bufferTime} min buffer` : ''}`;

    console.log(`✅ ${doc.name} (${doc.specialization}) — ${typeLabel}`);
  }

  console.log('\n🎉 Seed complete!');
  console.log('📧 Login with any doctor email');
  console.log('🔑 Password: Doctor@123');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});