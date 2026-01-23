import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Purchases } from '@revenuecat/purchases-js';
import { supabase } from '../lib/supabase';
import api from '../services/supabaseApi';
import { subscribeToRealtimeChanges, getRefreshCategories } from '../services/realtimeSync';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext'; // Import useLanguage
import {
  transformClientFromDB,
  transformContractorFromDB,
  transformInvoiceFromDB
} from '../utils/dataTransformers';
import {
  calculateRoomPrice,
  calculateRoomPriceWithMaterials,
  calculateWorkItemWithMaterials,
  formatPrice
} from '../utils/priceCalculations';
import { useClientManager } from '../hooks/useClientManager';
import { useProjectManager } from '../hooks/useProjectManager';
import { useInvoiceManager } from '../hooks/useInvoiceManager';
import { useContractorManager } from '../hooks/useContractorManager';
import { dbColumnsToPriceList, getDbColumnForItem, getDbColumnForCapacity } from '../services/priceListMapping';
import flatsImage from '../images/flats.jpg';
import housesImage from '../images/houses.jpg';
import firmsImage from '../images/firms.jpg';
import cottagesImage from '../images/cottages.jpg';
import { Loader2 } from 'lucide-react'; // Import Loader2

const AppDataContext = createContext();

export const useAppData = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ children }) => {
  const { user } = useAuth();
  const { t } = useLanguage(); // Get t function
  const [loading, setLoading] = useState(true);
  const [isPro, setIsPro] = useState(false); // Pro status

  // RevenueCat API Keys
  const RC_PUBLIC_API_KEY = process.env.REACT_APP_REVENUECAT_API_KEY || "strp_KfdxAGeUmSoFxUhzXUWDuxDxTMh"; // Public key for Web SDK

  // Stripe publishable key for client-side
  const STRIPE_PUBLISHABLE_KEY = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY;

  // RevenueCat Web SDK instance
  const rcInstanceRef = useRef(null);
  const [rcOfferings, setRcOfferings] = useState(null);

  // Prevent duplicate initial data loads
  const initialLoadDoneRef = useRef(false);
  const lastLoadedUserIdRef = useRef(null);

  // Initialize RevenueCat Web SDK
  const initializeRevenueCat = useCallback(async () => {
    if (!user?.id || rcInstanceRef.current) return;

    // Skip if using a Stripe key (SDK requires 'rcb_' billing key)
    if (RC_PUBLIC_API_KEY?.startsWith('strp_')) {
      console.warn('[RevenueCat] Skipping SDK init: Key is for Stripe, not Web Billing. Using Edge Function for status checks.');
      return;
    }

    try {
      // Configure and initialize RevenueCat
      rcInstanceRef.current = Purchases.configure(RC_PUBLIC_API_KEY, user.id);
      console.log('[RevenueCat] Initialized for user:', user.id);

      // Fetch offerings
      const offerings = await rcInstanceRef.current.getOfferings();
      setRcOfferings(offerings);
      console.log('[RevenueCat] Offerings loaded:', offerings);
    } catch (error) {
      console.error('[RevenueCat] Failed to initialize:', error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Track if pro status check is in progress to prevent duplicate calls
  const proCheckInProgressRef = useRef(false);

  const checkProStatus = useCallback(async () => {
    if (!user?.id) return;

    // Prevent duplicate calls (React Strict Mode double-invoke)
    if (proCheckInProgressRef.current) {
      console.log('[ProCheck] Already checking, skipping duplicate call');
      return;
    }

    proCheckInProgressRef.current = true;

    try {
      console.log('[ProCheck] Invoking secure check-subscription function...');

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error('[ProCheck] Function error:', error);
        setIsPro(false);
        return;
      }

      console.log('[ProCheck] Result:', data);

      if (data && typeof data.isPro === 'boolean') {
        setIsPro(data.isPro);
      } else {
        setIsPro(false);
      }

    } catch (err) {
      console.error('[ProCheck] Invocation failed:', err);
      setIsPro(false);
    } finally {
      proCheckInProgressRef.current = false;
    }
  }, [user?.id]);

  // grantPromotionalEntitlement REMOVED - Insecure usage of Secret Key in client side

  // Purchase using RevenueCat Web SDK
  const purchasePackage = async (packageToPurchase) => {
    if (!rcInstanceRef.current) {
      console.error('[RevenueCat] SDK not initialized');
      return { success: false, error: 'SDK not initialized' };
    }

    try {
      const { customerInfo } = await rcInstanceRef.current.purchase({ rcPackage: packageToPurchase });
      const hasProEntitlement = customerInfo?.entitlements?.active?.Pro !== undefined;
      setIsPro(hasProEntitlement);
      console.log('[RevenueCat] Purchase successful, Pro status:', hasProEntitlement);
      return { success: true, customerInfo };
    } catch (error) {
      console.error('[RevenueCat] Purchase failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Stripe checkout for Pro subscription (fallback/direct link)
  const initiateStripeCheckout = async (priceId) => {
    if (!user?.id || !STRIPE_PUBLISHABLE_KEY) {
      console.error("Missing user ID or Stripe key");
      return { success: false, error: "Configuration error" };
    }

    try {
      // Load Stripe
      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);

      if (!stripe) {
        return { success: false, error: "Failed to load Stripe" };
      }

      return { success: true, stripe };
    } catch (error) {
      console.error("Failed to initiate Stripe checkout:", error);
      return { success: false, error: error.message };
    }
  };

  // Refresh pro status (useful after successful payment)
  const refreshProStatus = async () => {
    await checkProStatus();
  };

  useEffect(() => {
    if (user?.id) {
      initializeRevenueCat();
      checkProStatus();
    }
    // Only re-run when user.id changes, not on every user object reference change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Default data structure
  const getDefaultData = () => ({
    clients: [],
    projectCategories: [
      {
        id: 'flats',
        name: 'Flats',
        count: 0,
        image: flatsImage,
        projects: []
      },
      {
        id: 'houses',
        name: 'Houses',
        count: 0,
        image: housesImage,
        projects: []
      },
      {
        id: 'companies',
        name: 'Companies',
        count: 0,
        image: firmsImage,
        projects: []
      },
      {
        id: 'cottages',
        name: 'Cottages',
        count: 0,
        image: cottagesImage,
        projects: []
      }
    ],
    archivedProjects: [], // Store archived projects
    projectRoomsData: {}, // Store rooms by project ID
    projectHistory: {}, // Store history events by project ID: { [projectId]: [{ type, date, ... }] }
    contractors: [], // Store contractor profiles
    contractorProjects: {}, // Store projects by contractor ID: { [contractorId]: { categories: [...], archivedProjects: [] } }
    invoices: [], // Store all invoices
    priceOfferSettings: {
      timeLimit: 30, // Days
      defaultValidityPeriod: 30,
      archiveRetentionDays: 30 // Default 30 days retention
    },
    activeContractorId: null, // Currently selected contractor
    projectFilterYear: 'all', // Filter year for projects
    generalPriceList: {
      work: [
        { name: 'Preparatory and demolition works', price: 15, unit: '€/h' },
        { name: 'Elektroinštalačné práce', subtitle: 'outlet', price: 65, unit: '€/pc' },
        { name: 'Vodoinštalačné práce', subtitle: 'outlet', price: 50, unit: '€/pc' },
        { name: 'Brick partitions', subtitle: '75 - 175mm', price: 23, unit: '€/m2' },
        { name: 'Brick load-bearing wall', subtitle: '200 - 450mm', price: 24, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'partition, simple', price: 37, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'partition, double', price: 47, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'partition, triple', price: 57, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'offset wall, simple', price: 32, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'offset wall, double', price: 42, unit: '€/m2' },
        { name: 'Plasterboarding', subtitle: 'ceiling', price: 35, unit: '€/m2' },
        { name: 'Netting', subtitle: 'wall', price: 9, unit: '€/m2' },
        { name: 'Netting', subtitle: 'ceiling', price: 13, unit: '€/m2' },
        { name: 'Plastering', subtitle: 'wall', price: 15, unit: '€/m2' },
        { name: 'Plastering', subtitle: 'ceiling', price: 19, unit: '€/m2' },
        { name: 'Facade Plastering', price: 12, unit: '€/m2' },
        { name: 'Installation of corner bead', price: 3.5, unit: '€/m' },
        { name: 'Plastering of window sash', price: 15, unit: '€/m' },
        { name: 'Penetration coating', price: 0.7, unit: '€/m2' },
        { name: 'Painting', subtitle: 'wall, 2 layers', price: 3, unit: '€/m2' },
        { name: 'Painting', subtitle: 'ceiling, 2 layers', price: 3, unit: '€/m2' },
        { name: 'Levelling', price: 9, unit: '€/m2' },
        { name: 'Floating floor', subtitle: 'laying', price: 9, unit: '€/m2' },
        { name: 'Lištovanie', subtitle: 'floating floor', price: 4.5, unit: '€/m' },
        { name: 'Tiling under 60cm', subtitle: 'ceramic', price: 35, unit: '€/m2' },
        { name: 'Jolly Edging', price: 30, unit: '€/m' },
        { name: 'Paving under 60cm', subtitle: 'ceramic', price: 35, unit: '€/m2' },
        { name: 'Plinth', subtitle: 'cutting and grinding', price: 16, unit: '€/m' },
        { name: 'Plinth', subtitle: 'bonding', price: 9, unit: '€/m' },
        { name: 'Large Format', subtitle: 'above 60cm', price: 85, unit: '€/m2' },
        { name: 'Grouting', subtitle: 'tiling and paving', price: 7, unit: '€/m2' },
        { name: 'Siliconing', price: 3.5, unit: '€/m' },
        { name: 'Window installation', price: 17, unit: '€/m' },
        { name: 'Installation of door jamb', price: 62, unit: '€/pc' },
        { name: 'Auxiliary and finishing work', price: 10, unit: '%' }
      ],
      material: [
        { name: 'Partition masonry', subtitle: '75 - 175mm', price: 30, unit: '€/m2', materialKey: 'brick_partitions' },
        { name: 'Load-bearing masonry', subtitle: '200 - 450mm', price: 65, unit: '€/m2', materialKey: 'brick_load_bearing' },
        { name: 'Plasterboard', subtitle: 'simple, partition', price: 30, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_partition_simple' },
        { name: 'Plasterboard', subtitle: 'double, partition', price: 50, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_partition_double' },
        { name: 'Plasterboard', subtitle: 'triple, partition', price: 70, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_partition_triple' },
        { name: 'Plasterboard', subtitle: 'simple, offset wall', price: 19, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_offset_simple' },
        { name: 'Plasterboard', subtitle: 'double, offset wall', price: 29, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_offset_double' },
        { name: 'Plasterboard', subtitle: 'ceiling', price: 19, unit: '€/pc', capacity: { value: 2.4, unit: 'm2' }, materialKey: 'plasterboarding_ceiling' },
        { name: 'Mesh', price: 1.2, unit: '€/m2', materialKey: 'netting_wall' },
        { name: 'Adhesive', subtitle: 'netting', price: 9, unit: '€/pkg', capacity: { value: 6, unit: 'm2' }, materialKey: 'adhesive_netting' },
        { name: 'Adhesive', subtitle: 'tiling and paving', price: 15, unit: '€/pkg', capacity: { value: 3, unit: 'm2' }, materialKey: 'adhesive_tiling' },
        { name: 'Plaster', price: 13, unit: '€/pkg', capacity: { value: 8, unit: 'm2' }, materialKey: 'plastering_wall' },
        { name: 'Facade Plaster', price: 25, unit: '€/pkg', capacity: { value: 10, unit: 'm2' }, materialKey: 'facade_plastering' },
        { name: 'Corner bead', price: 4, unit: '€/pc', capacity: { value: 2.5, unit: 'm' }, materialKey: 'corner_bead' },
        { name: 'Primer', price: 0.5, unit: '€/m2', materialKey: 'penetration_coating' },
        { name: 'Paint', subtitle: 'wall', price: 1, unit: '€/m2', materialKey: 'painting_wall' },
        { name: 'Paint', subtitle: 'ceiling', price: 1, unit: '€/m2', materialKey: 'painting_ceiling' },
        { name: 'Self-levelling compound', price: 20, unit: '€/pkg', capacity: { value: 1.2, unit: 'm2' }, materialKey: 'levelling' },
        { name: 'Floating floor', price: 20, unit: '€/m2', materialKey: 'floating_floor' },
        { name: 'Soklové lišty', price: 3, unit: '€/m', materialKey: 'skirting' },
        { name: 'Silicone', price: 12, unit: '€/pkg', capacity: { value: 14, unit: 'm' }, materialKey: 'siliconing' },
        { name: 'Tiles', subtitle: 'ceramic', price: 30, unit: '€/m2', materialKey: 'tiling_under_60' },
        { name: 'Pavings', subtitle: 'ceramic', price: 30, unit: '€/m2', materialKey: 'paving_under_60' },
        { name: 'Tiles', subtitle: 'large format', price: 150, unit: '€/m2', materialKey: 'tiling_large_format' },
        { name: 'Pavings', subtitle: 'large format', price: 150, unit: '€/m2', materialKey: 'paving_large_format' },
        { name: 'Auxiliary and fastening material', price: 10, unit: '%' }
      ],
      installations: [
        { name: 'Sanitary installations', subtitle: 'Corner valve', price: 10.5, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Standing mixer tap', price: 26, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Wall-mounted tap', price: 36, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Flush-mounted tap', price: 98, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Toilet combi', price: 67, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Concealed toilet', price: 205, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Sink', price: 52, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Sink with cabinet', price: 125, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Bathtub', price: 155, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Shower cubicle', price: 235, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Installation of gutter', price: 95, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Urinal', price: 53, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Bath screen', price: 85, unit: '€/pc' },
        { name: 'Sanitary installations', subtitle: 'Mirror', price: 35, unit: '€/pc' }
      ],
      others: [
        { name: 'Scaffolding', price: 10, unit: '€/day' },
        { name: 'Scaffolding', subtitle: 'assembly and disassembly', price: 3, unit: '€/m2' },
        { name: 'Core Drill', price: 25, unit: '€/h' },
        { name: 'Tool rental', price: 10, unit: '€/h' },
        { name: 'Commute', price: 1, unit: '€/km' },
        { name: 'VAT', price: 23, unit: '%' }
      ]
    }
  });

  // Helper function to get default categories structure
  const getDefaultCategories = () => [
    {
      id: 'flats',
      name: 'Flats',
      count: 0,
      image: flatsImage,
      projects: []
    },
    {
      id: 'houses',
      name: 'Houses',
      count: 0,
      image: housesImage,
      projects: []
    },
    {
      id: 'companies',
      name: 'Companies',
      count: 0,
      image: firmsImage,
      projects: []
    },
    {
      id: 'cottages',
      name: 'Cottages',
      count: 0,
      image: cottagesImage,
      projects: []
    }
  ];



  // Track if load is in progress to prevent concurrent loads
  const loadInProgressRef = useRef(false);

  // Load initial data from Supabase
  const loadInitialData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return getDefaultData();
    }

    // Prevent concurrent loads
    if (loadInProgressRef.current) {
      // console.log('[SUPABASE] Load already in progress, skipping');
      return null;
    }
    loadInProgressRef.current = true;

    try {
      // PHASE 1: Load contractors first to determine active contractor
      // This enables filtering for all subsequent queries (optimization)
      const [contractors, profileResult] = await Promise.all([
        api.contractors.getAll(),
        api.profiles.getFilterYear()
      ]);

      const projectFilterYear = profileResult;
      const transformedContractors = (contractors || []).map(transformContractorFromDB);

      // Determine active contractor early so we can filter subsequent queries
      const savedContractorId = localStorage.getItem('lastActiveContractorId');
      let activeContractorId = null;
      if (savedContractorId && transformedContractors.some(c => c.id === savedContractorId)) {
        activeContractorId = savedContractorId;
      } else if (transformedContractors.length > 0) {
        activeContractorId = transformedContractors[0].id;
      }

      // PHASE 2: Load data filtered by active contractor (OPTIMIZED - reduces data by 50-80%)
      // Note: We still need all priceLists for project linkage, but clients/projects/invoices are filtered
      const [clients, projects, invoices, allPriceLists] = await Promise.all([
        api.clients.getAll(activeContractorId),      // Filter by contractor
        api.projects.getAll(activeContractorId),     // Filter by contractor
        api.invoices.getAll(activeContractorId),     // Filter by contractor
        api.priceLists.getAll()                      // Need all for project linkage
      ]);

      /* console.log('[SUPABASE] Data loaded (filtered by contractor):', {
        contractors: contractors?.length,
        clients: clients?.length,
        projects: projects?.length,
        invoices: invoices?.length,
        activeContractorId
      }); */
      // console.log('[DEBUG FILTER] Filter Year:', projectFilterYear);

      // Transform clients
      const transformedClients = (clients || []).map(transformClientFromDB);

      // Transform projects - ALWAYS prioritize price_lists table (shared with iOS)
      // Only fall back to price_list_snapshot JSON for old projects without price_list_id
      const transformedProjects = (projects || []).map(project => {
        let priceListSnapshot = null;

        // PRIORITY 1: Load from price_lists table (iOS-compatible, source of truth)
        // This ensures Desktop and iOS always see the same prices
        if (project.price_list_id) {
          const linkedPriceList = (allPriceLists || []).find(pl => pl.c_id === project.price_list_id);
          if (linkedPriceList) {
            try {
              priceListSnapshot = dbColumnsToPriceList(linkedPriceList, getDefaultData().generalPriceList);
              // console.log('[SUPABASE] Loaded priceListSnapshot from price_lists table for project:', project.id);
            } catch (e) {
              console.warn('Failed to build priceListSnapshot from price_lists for project:', project.id, e);
            }
          }
        }

        // PRIORITY 2: Fallback to price_list_snapshot JSON for old projects
        // (projects created before iOS sync was implemented)
        if (!priceListSnapshot && project.price_list_snapshot) {
          try {
            priceListSnapshot = typeof project.price_list_snapshot === 'string'
              ? JSON.parse(project.price_list_snapshot)
              : project.price_list_snapshot;
            console.log('[SUPABASE] Loaded priceListSnapshot from JSON fallback for project:', project.id);
          } catch (e) {
            console.warn('Failed to parse price_list_snapshot for project:', project.id);
          }
        }
        let photos = [];
        if (project.photos) {
          try {
            photos = typeof project.photos === 'string'
              ? JSON.parse(project.photos)
              : project.photos;
          } catch (e) {
            console.warn('Failed to parse photos for project:', project.id);
          }
        }

        let projectHistory = [];
        if (project.project_history) {
          try {
            projectHistory = typeof project.project_history === 'string'
              ? JSON.parse(project.project_history)
              : project.project_history;
          } catch (e) {
            console.warn('Failed to parse project history for project:', project.id);
          }
        }

        // Find linked invoice to get status
        // invoices array is raw from DB here, so it uses snake_case keys or camelCase depending on supabase client.
        // checking useInvoiceManager createInvoice it sends project_id.
        // checking supabaseApi.js usually returns data as is.
        // Let's assume snake_case project_id based on DB schema.
        const linkedInvoice = (invoices || []).find(inv => inv.project_id === project.id);

        return {
          ...project,
          priceListSnapshot,
          photos,
          projectHistory,
          // Map snake_case to camelCase for frontend usage
          clientId: project.client_id,
          hasInvoice: project.has_invoice,
          invoiceId: project.invoice_id,
          invoiceStatus: linkedInvoice ? linkedInvoice.status : null,
          isArchived: project.is_archived
        };
      });

      // Build contractor projects structure
      const contractorProjects = {};

      // RE-ASSOCIATE PROJECTS TO CLIENTS FOR ACCURATE COUNTS
      // The initial transformClientFromDB might have empty or stale projects
      transformedClients.forEach(client => {
        client.projects = transformedProjects.filter(p => p.clientId === client.id && !p.isArchived);
      });

      transformedContractors.forEach(contractor => {
        const contractorProjectsList = transformedProjects.filter(p => p.contractor_id === contractor.id);

        // Group projects by category
        const categories = getDefaultCategories().map(cat => ({
          ...cat,
          projects: contractorProjectsList.filter(p => p.category === cat.id && !p.is_archived),
          count: contractorProjectsList.filter(p => p.category === cat.id && !p.is_archived).length
        }));
        contractorProjects[contractor.id] = {
          categories,
          archivedProjects: contractorProjectsList.filter(p => p.is_archived)
        };
      });

      // activeContractorId was already determined in Phase 1 above (for filtering)
      const activeContractor = transformedContractors.find(c => c.id === activeContractorId);

      // Find the GENERAL price list for this contractor (is_general=true)
      // This is the iOS-compatible format where general price list has is_general=true
      const generalPriceListData = (allPriceLists || []).find(
        pl => pl.contractor_id === activeContractorId && pl.is_general === true
      );

      // Fallback: try old format where price list was identified by c_id = activeContractorId
      const legacyPriceListData = !generalPriceListData
        ? (allPriceLists || []).find(pl => pl.c_id === activeContractorId)
        : null;

      const priceListData = generalPriceListData || legacyPriceListData;

      // Load from individual columns (for iOS compatibility)
      let generalPriceList;
      if (priceListData) {
        // Convert database columns to generalPriceList format
        generalPriceList = dbColumnsToPriceList(priceListData, getDefaultData().generalPriceList);
      } else {
        generalPriceList = getDefaultData().generalPriceList;
      }

      // Load price offer settings from active contractor
      let priceOfferSettings = getDefaultData().priceOfferSettings;
      if (activeContractor && activeContractor.price_offer_settings) {
        try {
          const settings = typeof activeContractor.price_offer_settings === 'string'
            ? JSON.parse(activeContractor.price_offer_settings)
            : activeContractor.price_offer_settings;
          priceOfferSettings = { ...priceOfferSettings, ...settings };
        } catch (e) {
          console.warn('Failed to parse price offer settings', e);
        }
      }

      // Transform invoices from database format to app format
      const transformedInvoices = (invoices || []).map(transformInvoiceFromDB).filter(Boolean);

      // Build project history map
      const projectHistoryMap = {};
      transformedProjects.forEach(p => {
        if (p.projectHistory && Array.isArray(p.projectHistory)) {
          projectHistoryMap[p.id] = p.projectHistory;
        }
      });

      return {
        clients: transformedClients || [],
        projectCategories: getDefaultCategories(),
        archivedProjects: transformedProjects.filter(p => p.is_archived) || [],
        projectRoomsData: {}, // Initialize empty, will be populated on demand
        projectHistory: projectHistoryMap, // Populate with loaded history
        contractors: transformedContractors || [],
        contractorProjects,
        invoices: transformedInvoices,
        priceOfferSettings,
        activeContractorId,
        projectFilterYear: projectFilterYear,
        generalPriceList
      };
    } catch (error) {
      console.error('[SUPABASE] Error loading data:', error);
      return getDefaultData();
    } finally {
      setLoading(false);
      loadInProgressRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id to prevent re-creating callback on user object reference changes
  const [appData, setAppData] = useState(getDefaultData);

  // Instantiate Managers

  const clientManager = useClientManager(appData, setAppData);

  const contractorManager = useContractorManager(appData, setAppData);

  // Pass findProjectById to invoiceManager as it needs it

  const projectManager = useProjectManager(appData, setAppData);

  const invoiceManager = useInvoiceManager(appData, setAppData, projectManager.addProjectHistoryEntry, projectManager.updateProject);




  // Load data from Supabase on mount
  useEffect(() => {
    const loadData = async () => {
      // Prevent duplicate loads for the same user (React Strict Mode / re-renders)
      if (initialLoadDoneRef.current && lastLoadedUserIdRef.current === user?.id) {
        console.log('[SUPABASE] Skipping duplicate initial load for user:', user?.id);
        return;
      }

      const data = await loadInitialData();

      // If null returned, load was skipped (already in progress)
      if (!data) return;

      setAppData(prev => ({
        ...data,
        // Preserve existing room data to prevent wiping it on re-renders/tab switches
        projectRoomsData: {
          ...(prev?.projectRoomsData || {}),
          ...(data.projectRoomsData || {})
        }
      }));

      initialLoadDoneRef.current = true;
      lastLoadedUserIdRef.current = user?.id;
    };

    if (user?.id) {
      loadData();
    } else {
      setLoading(false);
      // Reset refs on logout
      initialLoadDoneRef.current = false;
      lastLoadedUserIdRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Auto-delete expired archived projects
  useEffect(() => {
    if (!loading && appData.archivedProjects && appData.archivedProjects.length > 0) {
      const archiveRetentionDays = appData.priceOfferSettings?.archiveRetentionDays || 30;
      const now = new Date();

      appData.archivedProjects.forEach(project => {
        if (project.archived_date || project.archivedDate) {
          const archivedAt = new Date(project.archived_date || project.archivedDate);
          const diffTime = Math.abs(now - archivedAt);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays > archiveRetentionDays) {
            console.log(`[AutoDelete] Deleting project ${project.id} archived on ${project.archived_date || project.archivedDate} (Age: ${diffDays} days, Limit: ${archiveRetentionDays} days)`);
            projectManager.deleteArchivedProject(project.id);
          }
        }
      });
    }
  }, [loading, appData.priceOfferSettings?.archiveRetentionDays, appData.archivedProjects, projectManager]);

  // Real-time sync subscription - listen for changes from iOS or other clients
  useEffect(() => {
    if (!user?.id || loading) return;

    console.log('[RealtimeSync] Setting up real-time subscriptions');

    const handleRealtimeChange = async (batch) => {
      // Ensure batch is array
      const changes = Array.isArray(batch) ? batch : [batch];
      if (changes.length === 0) return;

      // 1. Identify async fetches needed (INSERTs for complex objects)
      const fetches = [];
      const newRecordMap = new Map(); // id -> data

      for (const change of changes) {
        const { eventType, record, table } = change;
        if (eventType === 'INSERT' && record) {
          const categories = getRefreshCategories(table);
          if (categories.includes('projects') && record.c_id) {
            fetches.push(api.projects.getById(record.c_id).then(res => {
              if (res) newRecordMap.set(record.c_id, res);
            }).catch(err => console.warn('Failed to fetch project', err)));
          }
          if (categories.includes('rooms') && record.c_id) {
            fetches.push(api.rooms.getById(record.c_id).then(res => {
              if (res) newRecordMap.set(record.c_id, res);
            }).catch(err => console.warn('Failed to fetch room', err)));
          }
        }
      }

      if (fetches.length > 0) {
        await Promise.all(fetches);
      }

      // 2. Atomic State Update
      setAppData(prev => {
        let next = { ...prev };

        // Helper for array updates
        const updateEntityArray = (list, record, transformed, eventType) => {
          const arr = [...(list || [])];
          if (eventType === 'DELETE' || record.is_deleted) {
            return arr.filter(i => i.id !== record.c_id && i.id !== record.id);
          } else if (eventType === 'INSERT') {
            return [...arr, transformed];
          } else {
            const idx = arr.findIndex(i => i.id === record.c_id || i.id === record.id);
            if (idx >= 0) arr[idx] = transformed;
            else arr.push(transformed);
            return arr;
          }
        };

        for (const change of changes) {
          const { eventType, record, table } = change;
          if (!record) continue;
          const categories = getRefreshCategories(table);

          // A. Contractors
          if (categories.includes('contractors')) {
            const transformed = transformContractorFromDB(record);
            next.contractors = updateEntityArray(next.contractors, record, transformed, eventType);
            // Handle settings update if active
            if ((record.c_id === next.activeContractorId || record.id === next.activeContractorId) && record.price_offer_settings) {
              try {
                const settings = typeof record.price_offer_settings === 'string' ? JSON.parse(record.price_offer_settings) : record.price_offer_settings;
                next.priceOfferSettings = { ...next.priceOfferSettings, ...settings };
                // console.log('[RealtimeSync] Updated priceOfferSettings');
              } catch (e) { }
            }
          }

          // B. Clients
          if (categories.includes('clients')) {
            next.clients = updateEntityArray(next.clients, record, transformClientFromDB(record), eventType);
          }

          // C. Projects
          if (categories.includes('projects')) {
            // We need to update the contractorProjects structure for the specific contractor
            // Assuming record has contractor_id
            const contractorId = record.contractor_id;
            if (contractorId && next.contractorProjects[contractorId]) {
              const fetchedProject = newRecordMap.get(record.c_id);
              const projectToUse = eventType === 'INSERT' ? fetchedProject : { ...record, id: record.c_id || record.id };

              // Only proceed if we have valid project data
              if (projectToUse) {
                const cp = { ...next.contractorProjects[contractorId] };
                const cats = cp.categories.map(cat => {
                  const projs = updateEntityArray(cat.projects, record, projectToUse, eventType);
                  // Re-filter by category to ensure correctness (if category changed)
                  return { ...cat, projects: projs.filter(p => p.category === cat.id && !p.is_archived), count: projs.filter(p => p.category === cat.id && !p.is_archived).length };
                });

                let archived = updateEntityArray(cp.archivedProjects, record, projectToUse, eventType);
                // check archived status
                if (eventType !== 'DELETE') {
                  archived = archived.filter(p => p.is_archived);
                }

                next.contractorProjects = {
                  ...next.contractorProjects,
                  [contractorId]: { ...cp, categories: cats, archivedProjects: archived }
                };
              }
            }
          }

          // D. Invoices 
          if (categories.includes('invoices')) {
            const transformed = transformInvoiceFromDB(record);
            if (transformed) {
              next.invoices = updateEntityArray(next.invoices, record, transformed, eventType);
            }
          }

          // E. Rooms
          if (categories.includes('rooms')) {
            const projectId = record.project_id;
            if (projectId && next.projectRoomsData[projectId]) {
              const prd = { ...next.projectRoomsData[projectId] };
              const fetchedRoom = newRecordMap.get(record.c_id);
              const roomToUse = eventType === 'INSERT' ? fetchedRoom : { ...record, id: record.c_id || record.id };

              if (roomToUse) {
                prd.rooms = updateEntityArray(prd.rooms, record, roomToUse, eventType);
                next.projectRoomsData = { ...next.projectRoomsData, [projectId]: prd };
              }
            }
          }

          // F. Price Lists
          if (categories.includes('priceLists') && record.contractor_id === next.activeContractorId && record.is_general) {
            next.generalPriceList = dbColumnsToPriceList(record, getDefaultData().generalPriceList);
          }
        }

        // G. WorkItems Invalidation (Processing all workItem changes in one pass)
        // Optimization: Collect all affected/stale rooms first
        const staleRoomIds = new Set();
        let staleAll = false;

        for (const change of changes) {
          const { table, record } = change;
          if (getRefreshCategories(table).includes('workItems') && record) {
            if (record.room_id) {
              staleRoomIds.add(record.room_id);
            } else if (!staleAll) {
              // Logic to find room for doors/windows etc
              // Fallback to staleAll if we can't efficiently find it
              // NOTE: Implementing deep search in client memory is risky if data isn't loaded. 
              // Safest medium-fix is to mark all staled if we can't ID the room.
              staleAll = true;
            }
          }
        }

        if (staleAll || staleRoomIds.size > 0) {
          const newPRD = { ...next.projectRoomsData };
          let changed = false;

          for (const pid in newPRD) {
            const pData = newPRD[pid];
            if (!pData?.rooms) continue;

            if (staleAll) {
              // Mark all rooms stale
              const newRooms = pData.rooms.map(r => r._workItemsStale ? r : { ...r, _workItemsStale: true });
              if (newRooms !== pData.rooms) {
                newPRD[pid] = { ...pData, rooms: newRooms };
                changed = true;
              }
            } else {
              // Mark specific rooms stale
              const newRooms = pData.rooms.map(r => {
                if (staleRoomIds.has(r.id) || staleRoomIds.has(r.c_id)) {
                  return { ...r, _workItemsStale: true };
                }
                return r;
              });
              // Only update object if actually changed (optimization)
              const actuallyChanged = newRooms.some((r, i) => r !== pData.rooms[i]);
              if (actuallyChanged) {
                newPRD[pid] = { ...pData, rooms: newRooms };
                changed = true;
              }
            }
          }
          if (changed) next.projectRoomsData = newPRD;
        }

        return next;
      });
    };

    // Subscribe to real-time changes
    const unsubscribe = subscribeToRealtimeChanges(user.id, handleRealtimeChange);

    // Cleanup on unmount
    return () => {
      console.log('[RealtimeSync] Cleaning up subscriptions');
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]); // Removed loadInitialData and activeContractorId to prevent re-subscribing












  const calculateProjectTotalPrice = (projectId, projectOverride = null) => {
    const rooms = projectManager.getProjectRooms(projectId);
    let totalPrice = 0;

    // Use provided project or find it
    let project = projectOverride;
    let projectPriceList = null;

    if (!project) {
      // Find the project to get its price list snapshot
      const projectResult = projectManager.findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }

    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    } else {
      // If no snapshot exists (old projects), fall back to current price list
      projectPriceList = appData.generalPriceList;
    }

    rooms.forEach(room => {
      const calculation = calculateRoomPriceWithMaterials(room, projectPriceList);
      totalPrice += calculation.total;
    });

    return totalPrice;
  };

  const calculateProjectTotalPriceWithBreakdown = (projectId, projectOverride = null) => {
    const rooms = projectManager.getProjectRooms(projectId);
    let totalWorkPrice = 0;
    let totalMaterialPrice = 0;
    let totalOthersPrice = 0;
    let allWorkItems = [];
    let allMaterialItems = [];
    let allOthersItems = [];

    // Use provided project or find it
    let project = projectOverride;
    let projectPriceList = null;

    if (!project) {
      // Find the project to get its price list snapshot
      const projectResult = projectManager.findProjectById(projectId);
      if (projectResult) {
        project = projectResult.project;
      }
    }

    if (project && project.priceListSnapshot) {
      // Use project's frozen price list
      projectPriceList = project.priceListSnapshot;
    } else {
      projectPriceList = appData.generalPriceList;
    }

    rooms.forEach(room => {
      const calculation = calculateRoomPriceWithMaterials(room, projectPriceList);
      totalWorkPrice += calculation.workTotal || 0;
      totalMaterialPrice += calculation.materialTotal || 0;
      totalOthersPrice += calculation.othersTotal || 0;

      if (calculation.items) {
        allWorkItems = allWorkItems.concat(calculation.items);
      }
      if (calculation.materialItems) {
        allMaterialItems = allMaterialItems.concat(calculation.materialItems);
      }
      if (calculation.othersItems) {
        allOthersItems = allOthersItems.concat(calculation.othersItems);
      }
    });

    return {
      workTotal: totalWorkPrice,
      materialTotal: totalMaterialPrice,
      othersTotal: totalOthersPrice,
      total: totalWorkPrice + totalMaterialPrice + totalOthersPrice,
      items: allWorkItems,
      materialItems: allMaterialItems,
      othersItems: allOthersItems
    };
  };

  // General price list management functions
  // iOS-compatible: saves to price_lists table with is_general=true and contractor_id
  const updateGeneralPriceList = (category, itemIndex, newPrice, newCapacity) => {
    setAppData(prev => {
      const newGeneralPriceList = {
        ...prev.generalPriceList,
        [category]: prev.generalPriceList[category].map((item, index) => {
          if (index !== itemIndex) return item;

          const updatedItem = { ...item };
          if (newPrice !== undefined) updatedItem.price = parseFloat(newPrice);
          if (newCapacity !== undefined && updatedItem.capacity) {
            updatedItem.capacity = { ...updatedItem.capacity, value: parseFloat(newCapacity) };
          }
          return updatedItem;
        })
      };

      // Save to Supabase if we have a contractor
      if (prev.activeContractorId) {
        const updateData = {};
        let hasUpdates = false;

        // Handle price update
        if (newPrice !== undefined) {
          const columnName = getDbColumnForItem(category, itemIndex);
          if (columnName) {
            updateData[columnName] = parseFloat(newPrice);
            hasUpdates = true;
          }
        }

        // Handle capacity update
        if (newCapacity !== undefined) {
          const capacityColumn = getDbColumnForCapacity(category, itemIndex);
          if (capacityColumn) {
            updateData[capacityColumn] = parseFloat(newCapacity);
            hasUpdates = true;
          }
        }


        if (hasUpdates) {
          api.priceLists.upsertGeneral(prev.activeContractorId, updateData)
            .catch(err => console.error('Failed to save general price list:', err));
        }
      }

      return { ...prev, generalPriceList: newGeneralPriceList };
    });
  };

  const saveGeneralPriceListBulk = async (updates) => {
    // updates: { [category]: { [index]: { price: number, capacity: number } } }

    // 1. Update Local State
    setAppData(prev => {
      const newGeneralPriceList = { ...prev.generalPriceList };

      Object.entries(updates).forEach(([category, catUpdates]) => {
        if (newGeneralPriceList[category]) {
          newGeneralPriceList[category] = newGeneralPriceList[category].map((item, index) => {
            if (catUpdates[index]) {
              const updated = { ...item };
              if (catUpdates[index].price !== undefined) updated.price = catUpdates[index].price;
              if (catUpdates[index].capacity !== undefined && updated.capacity) {
                updated.capacity = { ...updated.capacity, value: catUpdates[index].capacity };
              }
              return updated;
            }
            return item;
          });
        }
      });
      return { ...prev, generalPriceList: newGeneralPriceList };
    });

    // 2. Save to Supabase
    const activeContractorId = appData.activeContractorId;
    if (activeContractorId) {
      const dbUpdates = {};

      Object.entries(updates).forEach(([category, catUpdates]) => {
        Object.entries(catUpdates).forEach(([indexStr, data]) => {
          const index = parseInt(indexStr);
          // Map Price
          if (data.price !== undefined) {
            const col = getDbColumnForItem(category, index);
            if (col) dbUpdates[col] = data.price;
          }
          // Map Capacity
          if (data.capacity !== undefined) {
            const col = getDbColumnForCapacity(category, index);
            if (col) dbUpdates[col] = data.capacity;
          }
        });
      });

      if (Object.keys(dbUpdates).length > 0) {
        try {
          await api.priceLists.upsertGeneral(activeContractorId, dbUpdates);
        } catch (err) {
          console.error('Failed to bulk save general price list:', err);
        }
      }
    }
  };



  const resetGeneralPriceItem = (category, itemIndex) => {
    // Get the original price from defaults (we'll need to store this)
    const defaultData = getDefaultData();
    const originalPrice = defaultData.generalPriceList[category][itemIndex]?.price;

    if (originalPrice !== undefined) {
      setAppData(prev => {
        const newGeneralPriceList = {
          ...prev.generalPriceList,
          [category]: prev.generalPriceList[category].map((item, index) =>
            index === itemIndex ? { ...item, price: originalPrice } : item
          )
        };

        // Save to Supabase if we have a contractor
        if (prev.activeContractorId) {
          // Get the database column name for this specific item
          const columnName = getDbColumnForItem(category, itemIndex);

          if (columnName) {
            // Save individual column value to GENERAL price list (is_general=true)
            const updateData = { [columnName]: originalPrice };
            api.priceLists.upsertGeneral(prev.activeContractorId, updateData)
              .catch(err => console.error('Failed to save general price list:', err));
          }
        }

        return {
          ...prev,
          generalPriceList: newGeneralPriceList
        };
      });
    }
  };



  const updateProjectFilterYear = async (year) => {
    setAppData(prev => ({ ...prev, projectFilterYear: year }));
    if (user?.id) {
      try {
        console.log('[DEBUG FILTER] Saving filter year:', year);
        await api.profiles.upsertFilterYear(year);
      } catch (err) {
        console.error("Error saving filter year preference:", err);
      }
    }
  };

  const contextValue = {
    // Data
    clients: appData.clients,
    projectCategories: contractorManager.getProjectCategoriesForContractor(appData.activeContractorId),
    projectRoomsData: appData.projectRoomsData,
    generalPriceList: appData.generalPriceList,
    archivedProjects: appData.archivedProjects,
    contractors: appData.contractors,
    priceOfferSettings: appData.priceOfferSettings,
    activeContractorId: appData.activeContractorId,
    projectFilterYear: appData.projectFilterYear,
    invoices: appData.invoices,

    // Helper functions
    getProjectCategoriesForContractor: contractorManager.getProjectCategoriesForContractor,
    getArchivedProjectsForContractor: contractorManager.getArchivedProjectsForContractor,
    getOrphanProjectCategories: contractorManager.getOrphanProjectCategories,
    hasOrphanProjects: contractorManager.hasOrphanProjects,

    // Client functions
    addClient: clientManager.addClient,
    updateClient: clientManager.updateClient,
    deleteClient: clientManager.deleteClient,

    // Project functions
    addProject: projectManager.addProject,
    updateProject: projectManager.updateProject,
    deleteProject: projectManager.deleteProject,
    archiveProject: projectManager.archiveProject,
    unarchiveProject: projectManager.unarchiveProject,
    deleteArchivedProject: projectManager.deleteArchivedProject,

    // Contractor functions
    addContractor: contractorManager.addContractor,
    updateContractor: contractorManager.updateContractor,
    deleteContractor: contractorManager.deleteContractor,
    setActiveContractor: contractorManager.setActiveContractor,
    updatePriceOfferSettings: contractorManager.updatePriceOfferSettings,

    // Invoice functions
    createInvoice: (projectId, categoryId, invoiceData) => invoiceManager.createInvoice(projectId, categoryId, invoiceData, projectManager.findProjectById),
    updateInvoice: invoiceManager.updateInvoice,
    deleteInvoice: invoiceManager.deleteInvoice,
    getInvoiceById: invoiceManager.getInvoiceById,
    getInvoicesForContractor: invoiceManager.getInvoicesForContractor,
    getInvoiceForProject: invoiceManager.getInvoiceForProject,

    // History functions
    getProjectHistory: projectManager.getProjectHistory,
    addProjectHistoryEntry: projectManager.addProjectHistoryEntry,

    // Receipt functions
    getProjectReceipts: projectManager.getProjectReceipts,
    addReceipt: projectManager.addReceipt,
    deleteReceipt: projectManager.deleteReceipt,
    analyzeReceiptImage: projectManager.analyzeReceiptImage,

    // Room functions
    addRoomToProject: projectManager.addRoomToProject,
    updateProjectRoom: projectManager.updateProjectRoom,
    deleteProjectRoom: projectManager.deleteProjectRoom,
    getProjectRooms: projectManager.getProjectRooms,

    // Relationship functions
    assignProjectToClient: clientManager.assignProjectToClient,
    removeProjectFromClient: clientManager.removeProjectFromClient,

    // Helper functions
    findProjectById: projectManager.findProjectById,
    findClientById: clientManager.findClientById,
    loadProjectDetails: projectManager.loadProjectDetails,
    updateProjectFilterYear,

    // Price calculation functions
    calculateRoomPrice,
    calculateRoomPriceWithMaterials,
    calculateProjectTotalPrice,
    calculateProjectTotalPriceWithBreakdown,
    calculateWorkItemWithMaterials,
    formatPrice,

    // Price list management functions
    updateGeneralPriceList,
    saveGeneralPriceListBulk,
    resetGeneralPriceItem,

    // Pro Status & RevenueCat
    isPro,
    // grantPromotionalEntitlement removed
    checkProStatus,
    refreshProStatus,
    initiateStripeCheckout,
    purchasePackage,
    rcOfferings,
    stripePublishableKey: STRIPE_PUBLISHABLE_KEY
  };

  // Show loading screen while data is being fetched
  if (loading) {
    return (
      <AppDataContext.Provider value={contextValue}>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900">
          <Loader2 className="w-8 h-8 text-gray-900 dark:text-white animate-spin mb-4" />
          <div className="text-center">
            <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">
              {t('Loading data')}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {t('Please wait while we load your projects')}
            </div>
          </div>
        </div>
      </AppDataContext.Provider>
    );
  }

  return (
    <AppDataContext.Provider value={contextValue}>
      {children}
    </AppDataContext.Provider>
  );
};

export default AppDataContext;