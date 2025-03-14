// This file holds the main code for the Figma to Claude plugin
// Code in this file has access to the Figma document via the figma global object
// This plugin leverages Figma's DevMode to extract code and design information

// Types for extracted data
interface Screen {
  id: string;
  name: string;
  type: string;
  width: number;
  height: number;
  image: string;
  description: string;
  cssCode?: string;
  reactCode?: string;
  tailwindCode?: string;
  componentStructure?: any;
}

interface ColorStyle {
  name: string;
  id: string;
  rgb: {
    r: number;
    g: number;
    b: number;
    a: number;
  };
  hex: string;
  description: string;
}

interface TypographyStyle {
  name: string;
  id: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  lineHeight: number | null;
  letterSpacing: number | null;
  description: string;
}

interface ExtractedData {
  screens: Screen[];
  components: any[];
  styles: {
    colors: ColorStyle[];
    typography: TypographyStyle[];
    spacing: number[];
    variables?: any[];
    tokens?: any[];
  };
  metadata: {
    projectName: string;
    date: string;
    author: string;
    designSystem?: string;
  };
  devModeData?: {
    available: boolean;
    componentLibraries?: string[];
    designTokens?: any;
  };
}

interface MessageHandler {
  'extract-selected': () => Promise<void>;
  'extract-styles': () => Promise<void>;
  'generate-documentation': () => void;
  'export-claude': () => void;
  'cancel': () => void;
}

// Inicialización del plugin
figma.showUI(__html__, { width: 450, height: 550 });

// Variables globales para almacenar datos de extracción
let extractedData: ExtractedData = {
  screens: [],
  components: [],
  styles: {
    colors: [],
    typography: [],
    spacing: []
  },
  metadata: {
    projectName: figma.root.name,
    date: new Date().toISOString(),
    author: figma.currentUser ? figma.currentUser.name : "Unknown"
  }
};

// Comprueba si DevMode está disponible
const isDevModeAvailable = () => {
  // Esta es una comprobación hipotética, ya que la API de DevMode
  // no está completamente documentada públicamente
  return 'devMode' in figma || 'codegen' in figma;
};

// Inicializa la información de DevMode
function initializeDevModeData() {
  extractedData.devModeData = {
    available: isDevModeAvailable()
  };
  
  // Si DevMode está disponible, intenta obtener información adicional
  if (extractedData.devModeData.available) {
    // Nota: Estas propiedades son hipotéticas y deberán ajustarse
    // a la API real de DevMode cuando esté completamente disponible
    try {
      // Aquí se intentaría acceder a las bibliotecas de componentes
      // y a los tokens de diseño a través de la API de DevMode
      console.log("DevMode disponible - recopilando datos adicionales");
    } catch (error) {
      console.error("Error al acceder a los datos de DevMode:", error);
    }
  }
  
  return extractedData.devModeData.available;
}

// Manejo de mensajes de la UI
figma.ui.onmessage = async (msg) => {
  const handlers: MessageHandler = {
    'extract-selected': async () => {
      // Inicializa datos de DevMode antes de extraer frames
      initializeDevModeData();
      await extractSelectedFrames();
    },
    'extract-styles': async () => {
      await extractDesignStyles();
    },
    'generate-documentation': () => {
      generateDocumentation();
    },
    'export-claude': () => {
      exportForClaude();
    },
    'cancel': () => {
      figma.closePlugin();
    }
  };

  const handler = handlers[msg.type as keyof MessageHandler];
  if (handler) {
    await handler();
  }
};

// Utility functions for DevMode (stubs that can be implemented when API is available)
// These are placeholder implementations for the missing functions
async function extractCssFromNode(node: SceneNode): Promise<string> {
  // Placeholder implementation - would use Figma's DevMode API when available
  return `/* CSS for ${node.name} */\n.${node.name.toLowerCase().replace(/\s+/g, '-')} {\n  /* CSS properties would go here */\n}`;
}

async function extractReactFromNode(node: SceneNode): Promise<string> {
  // Placeholder implementation - would use Figma's DevMode API when available
  return `// React component for ${node.name}\nimport React from 'react';\n\nexport function ${node.name.replace(/\s+/g, '')}() {\n  return (\n    <div className="${node.name.toLowerCase().replace(/\s+/g, '-')}">\n      {/* Component content would go here */}\n    </div>\n  );\n}`;
}

async function extractTailwindFromNode(node: SceneNode): Promise<string> {
  // Placeholder implementation - would use Figma's DevMode API when available
  return `<!-- Tailwind HTML for ${node.name} -->\n<div class="w-full h-full flex items-center justify-center">\n  <!-- Content would go here -->\n</div>`;
}

// Define an interface for the component structure
interface ComponentStructure {
  name: string;
  type: string;
  id: string;
  children?: ComponentStructure[];
}

function extractComponentStructure(node: SceneNode): ComponentStructure {
  // Placeholder implementation - would traverse component/instance structure
  const structure: ComponentStructure = {
    name: node.name,
    type: node.type,
    id: node.id
  };
  
  // Add children if applicable
  if ('children' in node) {
    const childNode = node as FrameNode | GroupNode | InstanceNode | ComponentNode;
    structure.children = childNode.children.map(child => ({
      name: child.name,
      type: child.type,
      id: child.id
    }));
  }
  
  return structure;
}

// Función para extraer frames seleccionados
async function extractSelectedFrames() {
  const selection = figma.currentPage.selection;
  
  if (!selection.length) {
    figma.ui.postMessage({ 
      type: 'error', 
      message: 'Please select at least one frame to export',
      context: 'screens'
    });
    return;
  }
  
  figma.ui.postMessage({ type: 'extraction-started' });
  extractedData.screens = [];
  
  // Procesar cada frame seleccionado
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      try {
        // Generar una imagen del frame
        const bytes = await node.exportAsync({
          format: 'PNG',
          constraint: { type: 'SCALE', value: 2 }
        });
        
        // Convertir a base64 para mostrar o transferir
        const base64Image = figma.base64Encode(bytes);
        
        // Extraer información del frame
        // Fix: Use getPluginData or a default empty string instead of description property
        const frameData: Screen = {
          id: node.id,
          name: node.name,
          type: node.type,
          width: node.width,
          height: node.height,
          image: base64Image,
          description: node.getPluginData('description') || ''
        };
        
        // Si DevMode está disponible, intenta extraer información de código
        if (extractedData.devModeData?.available) {
          try {
            // Intenta extraer código CSS (mediante DevMode API hipotética)
            frameData.cssCode = await extractCssFromNode(node);
            frameData.reactCode = await extractReactFromNode(node);
            frameData.tailwindCode = await extractTailwindFromNode(node);
            frameData.componentStructure = extractComponentStructure(node);
          } catch (error) {
            console.error("Error extrayendo código del nodo:", error);
          }
        }
        
        extractedData.screens.push(frameData);
      } catch (error) {
        console.error('Error exporting frame:', error);
      }
    }
  }
  
  figma.ui.postMessage({ 
    type: 'extraction-completed', 
    data: extractedData.screens 
  });
}

// Función para extraer estilos de diseño
async function extractDesignStyles() {
  figma.ui.postMessage({ type: 'styles-extraction-started' });
  extractedData.styles = {
    colors: [],
    typography: [],
    spacing: []
  };
  
  // Extraer estilos de color
  const colorStyles = figma.getLocalPaintStyles();
  for (const style of colorStyles) {
    const paint = style.paints[0];
    if (paint && paint.type === 'SOLID') {
      // Fixed: Separate color and opacity correctly
      const { r, g, b } = paint.color;
      const a = paint.opacity !== undefined ? paint.opacity : 1;
      
      const rgbColor = {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
        a: a
      };
      
      const hexColor = rgbToHex(rgbColor.r, rgbColor.g, rgbColor.b);
      
      extractedData.styles.colors.push({
        name: style.name,
        id: style.id,
        rgb: rgbColor,
        hex: hexColor,
        description: style.description || ''
      });
    }
  }
  
  // Extraer estilos de texto
  const textStyles = figma.getLocalTextStyles();
  for (const style of textStyles) {
    // Fix: Handle different LineHeight types
    let lineHeightValue: number | null = null;
    if (style.lineHeight && style.lineHeight.unit !== 'AUTO') {
      if (style.lineHeight.unit === 'PIXELS') {
        lineHeightValue = style.lineHeight.value;
      } else if (style.lineHeight.unit === 'PERCENT') {
        lineHeightValue = style.lineHeight.value * style.fontSize / 100;
      }
    }
    
    // Fix: Handle different LetterSpacing types
    let letterSpacingValue: number | null = null;
    if (style.letterSpacing && style.letterSpacing.unit !== 'PERCENT') {
      letterSpacingValue = style.letterSpacing.value;
    }

    extractedData.styles.typography.push({
      name: style.name,
      id: style.id,
      fontFamily: style.fontName.family,
      fontStyle: style.fontName.style,
      fontSize: style.fontSize,
      lineHeight: lineHeightValue,
      letterSpacing: letterSpacingValue,
      description: style.description || ''
    });
  }
  
  // Aproximar sistema de espaciado analizando distancias comunes
  const spacingValues = extractSpacingFromSelection();
  extractedData.styles.spacing = spacingValues;
  
  figma.ui.postMessage({ 
    type: 'styles-extraction-completed', 
    data: extractedData.styles 
  });
}

// Función para extraer espaciado
function extractSpacingFromSelection(): number[] {
  const spacing = new Set<number>();
  const selection = figma.currentPage.selection;
  
  // Si hay al menos un frame seleccionado, analizamos sus hijos
  for (const node of selection) {
    if ('children' in node) {
      // Recopilamos distancias entre elementos adyacentes
      const children = node.children;
      for (let i = 0; i < children.length - 1; i++) {
        const current = children[i];
        const next = children[i + 1];
        
        // Distancia horizontal
        const horizontalGap = next.x - (current.x + current.width);
        if (horizontalGap > 0) spacing.add(Math.round(horizontalGap));
        
        // Distancia vertical
        const verticalGap = next.y - (current.y + current.height);
        if (verticalGap > 0) spacing.add(Math.round(verticalGap));
      }
      
      // También analizamos padding dentro del contenedor
      if (node.type === 'FRAME') {
        const frameNode = node as FrameNode;
        if (frameNode.layoutMode !== 'NONE') {
          if (frameNode.paddingLeft !== undefined) spacing.add(Math.round(frameNode.paddingLeft));
          if (frameNode.paddingRight !== undefined) spacing.add(Math.round(frameNode.paddingRight));
          if (frameNode.paddingTop !== undefined) spacing.add(Math.round(frameNode.paddingTop));
          if (frameNode.paddingBottom !== undefined) spacing.add(Math.round(frameNode.paddingBottom));
        }
      }
    }
  }
  
  return Array.from(spacing).sort((a, b) => a - b);
}

// Función para generar documentación
function generateDocumentation() {
  // Crear markdown con la información extraída
  let markdown = `# ${extractedData.metadata.projectName} - Design Documentation\n\n`;
  markdown += `Generated: ${new Date().toLocaleString()}\n`;
  markdown += `Author: ${extractedData.metadata.author}\n\n`;
  
  // Información sobre DevMode si está disponible
  if (extractedData.devModeData?.available) {
    markdown += `> This documentation was enhanced with Figma DevMode data\n\n`;
  }
  
  // Agregar sección de pantallas
  markdown += `## Screens\n\n`;
  extractedData.screens.forEach((screen) => {
    markdown += `### ${screen.name}\n\n`;
    markdown += `![${screen.name}]\n\n`;
    if (screen.description) markdown += `${screen.description}\n\n`;
    
    // Si hay código disponible desde DevMode, incluirlo
    if (screen.cssCode) {
      markdown += `#### CSS Code\n\n\`\`\`css\n${screen.cssCode}\n\`\`\`\n\n`;
    }
    
    if (screen.reactCode) {
      markdown += `#### React Component\n\n\`\`\`jsx\n${screen.reactCode}\n\`\`\`\n\n`;
    }
    
    if (screen.tailwindCode) {
      markdown += `#### Tailwind HTML\n\n\`\`\`html\n${screen.tailwindCode}\n\`\`\`\n\n`;
    }
  });
  
  // Agregar sección de estilos
  markdown += `## Design System\n\n`;
  
  // Colores
  markdown += `### Colors\n\n`;
  extractedData.styles.colors.forEach(color => {
    markdown += `- **${color.name}**: ${color.hex}\n`;
  });
  markdown += `\n`;
  
  // Tipografía
  markdown += `### Typography\n\n`;
  extractedData.styles.typography.forEach(font => {
    markdown += `- **${font.name}**: ${font.fontFamily} ${font.fontStyle}, ${font.fontSize}px\n`;
  });
  markdown += `\n`;
  
  // Espaciado
  markdown += `### Spacing\n\n`;
  markdown += `Common spacing values: ${extractedData.styles.spacing.join('px, ')}px\n\n`;
  
  // Información de la estructura de componentes si está disponible
  if (extractedData.screens.some(screen => screen.componentStructure)) {
    markdown += `## Component Structure\n\n`;
    extractedData.screens.forEach(screen => {
      if (screen.componentStructure) {
        markdown += `### ${screen.name} Structure\n\n`;
        markdown += `\`\`\`json\n${JSON.stringify(screen.componentStructure, null, 2)}\n\`\`\`\n\n`;
      }
    });
  }
  
  figma.ui.postMessage({ 
    type: 'documentation-generated', 
    markdown: markdown 
  });
}

// Interfaz para la exportación a Claude
interface ClaudeExport {
  designMetadata: {
    projectName: string;
    date: string;
    author: string;
  };
  screens: {
    name: string;
    description: string;
    dimensions: string;
  }[];
  designSystem: {
    colors: {
      name: string;
      value: string;
      tailwindEquivalent: string;
    }[];
    typography: {
      name: string;
      family: string;
      size: number;
      tailwindFontSize: string;
    }[];
    spacing: {
      value: number;
      tailwindSpacing: string;
    }[];
  };
  promptInstructions: string;
}

// Función para exportar datos en formato optimizado para Claude
function exportForClaude() {
  // Crear un objeto estructurado con toda la información
  const claudeExport: ClaudeExport = {
    designMetadata: extractedData.metadata,
    screens: extractedData.screens.map(screen => ({
      name: screen.name,
      description: screen.description || '',
      dimensions: `${screen.width} x ${screen.height}`,
      // No incluimos las imágenes aquí, se exportarán como archivos separados
    })),
    designSystem: {
      colors: extractedData.styles.colors.map(color => ({
        name: color.name,
        value: color.hex,
        tailwindEquivalent: findClosestTailwindColor(color.hex)
      })),
      typography: extractedData.styles.typography.map(font => ({
        name: font.name,
        family: font.fontFamily,
        size: font.fontSize,
        tailwindFontSize: mapToTailwindFontSize(font.fontSize)
      })),
      spacing: extractedData.styles.spacing.map(value => ({
        value: value,
        tailwindSpacing: mapToTailwindSpacing(value)
      }))
    },
    promptInstructions: `
Please create React components using Tailwind CSS based on these Figma designs.
The design shows ${extractedData.screens.length} screens/components that should be implemented.
Follow the design system specifications provided for colors, typography, and spacing.
Use the closest Tailwind CSS classes for all styling.
    `.trim()
  };
  
  // Enviar el objeto para descargar
  figma.ui.postMessage({ 
    type: 'claude-export-ready', 
    data: claudeExport 
  });
}

// Función auxiliar: convertir RGB a HEX
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + 
    ((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)
    .toUpperCase();
}

// Función auxiliar: encontrar el color Tailwind más cercano
function findClosestTailwindColor(hexColor: string): string {
  // Aquí implementarías un algoritmo para encontrar la clase Tailwind
  // más cercana al color dado. Para simplificar, esto es un placeholder.
  return `tailwind-color-placeholder`;
}

// Función auxiliar: mapear tamaño de fuente a Tailwind
function mapToTailwindFontSize(fontSize: number): string {
  // Mapeo aproximado a clases de Tailwind
  if (fontSize <= 12) return 'text-xs';
  if (fontSize <= 14) return 'text-sm';
  if (fontSize <= 16) return 'text-base';
  if (fontSize <= 18) return 'text-lg';
  if (fontSize <= 20) return 'text-xl';
  if (fontSize <= 24) return 'text-2xl';
  if (fontSize <= 30) return 'text-3xl';
  if (fontSize <= 36) return 'text-4xl';
  if (fontSize <= 48) return 'text-5xl';
  return 'text-6xl';
}

// Función auxiliar: mapear espaciado a Tailwind
function mapToTailwindSpacing(space: number): string {
  // Mapeo aproximado a clases de Tailwind
  const remValue = space / 16; // Convertir px a rem (aproximado)
  
  if (remValue <= 0.25) return 'p-0.5 or m-0.5';
  if (remValue <= 0.5) return 'p-1 or m-1';
  if (remValue <= 0.75) return 'p-1.5 or m-1.5';
  if (remValue <= 1) return 'p-2 or m-2';
  if (remValue <= 1.5) return 'p-3 or m-3';
  if (remValue <= 2) return 'p-4 or m-4';
  if (remValue <= 2.5) return 'p-5 or m-5';
  if (remValue <= 3) return 'p-6 or m-6';
  if (remValue <= 3.5) return 'p-7 or m-7';
  if (remValue <= 4) return 'p-8 or m-8';
  if (remValue <= 5) return 'p-10 or m-10';
  if (remValue <= 6) return 'p-12 or m-12';
  if (remValue <= 8) return 'p-16 or m-16';
  if (remValue <= 10) return 'p-20 or m-20';
  if (remValue <= 12) return 'p-24 or m-24';
  if (remValue <= 14) return 'p-28 or m-28';
  if (remValue <= 16) return 'p-32 or m-32';
  return 'custom';
}