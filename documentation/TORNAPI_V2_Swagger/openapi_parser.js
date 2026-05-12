const fs = require('fs');
const path = require('path');

/**
 * OpenAPI Specification Parser
 * Extracts detailed API endpoint information from a JSON OpenAPI (Swagger) spec file.
 * It resolves all $ref references to provide a flattened, readable structure.
 *
 * Usage:
 * node documentation/openapi_parser.js <path_to_openapi_json> [output_basename]
 *
 * Example:
 * node documentation/openapi_parser.js c:/Users/jacob/Development/StuckyCo/TORNagator/documentation/torn_swagger_openapi.json documentation/torn_api_docs
 */

// Function to resolve a single OpenAPI $ref reference
function resolveRef(ref, openApiSpec) {
    if (!ref || typeof ref !== 'string' || !ref.startsWith('#/')) {
        return ref;
    }

    const parts = ref.substring(2).split('/');
    let current = openApiSpec;
    for (const part of parts) {
        // Decode URI component to handle paths with special characters (e.g., ~1 for /)
        const decodedPart = decodeURIComponent(part.replace(/~1/g, '/').replace(/~0/g, '~'));
        if (current && current[decodedPart]) {
            current = current[decodedPart];
        } else {
            console.warn(`Could not resolve reference: ${ref} at part ${decodedPart}`);
            return { $ref: ref, resolved: false }; // Return original ref with a flag
        }
    }
    return current;
}

// Function to recursively resolve OpenAPI $ref references within an object
function deepResolveRefs(obj, openApiSpec) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => deepResolveRefs(item, openApiSpec));
    }

    const newObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (key === '$ref') {
                const resolved = resolveRef(obj[key], openApiSpec);
                // If the resolved reference is an object, deep resolve it too
                return deepResolveRefs(resolved, openApiSpec);
            } else if (typeof obj[key] === 'object') {
                newObj[key] = deepResolveRefs(obj[key], openApiSpec);
            } else {
                newObj[key] = obj[key];
            }
        }
    }
    return newObj;
}

async function parseOpenApiSpec(inputFilePath, outputBaseName) {
    try {
        console.log(`Reading OpenAPI spec from: ${inputFilePath}...`);
        const rawData = fs.readFileSync(inputFilePath, 'utf8');
        const openApiSpec = JSON.parse(rawData);

        const extractedData = [];

        for (const pathKey in openApiSpec.paths) {
            const pathItem = openApiSpec.paths[pathKey];

            for (const method in pathItem) {
                // Ensure it's an HTTP method (get, post, put, delete, patch, head, options)
                if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
                    const operation = pathItem[method];

                    const category = operation.tags && operation.tags.length > 0 ? operation.tags[0] : 'General';
                    const summary = operation.summary || '';
                    const description = operation.description || '';

                    const parameters = [];
                    if (operation.parameters) {
                        for (const param of operation.parameters) {
                            // Resolve the parameter itself and then deep resolve its schema
                            const resolvedParam = deepResolveRefs(param, openApiSpec);
                            parameters.push(resolvedParam);
                        }
                    }

                    const responses = {};
                    if (operation.responses) {
                        for (const statusCode in operation.responses) {
                            const response = operation.responses[statusCode];
                            // Resolve the response itself and then deep resolve its content/schema
                            const resolvedResponse = deepResolveRefs(response, openApiSpec);
                            responses[statusCode] = resolvedResponse;
                        }
                    }

                    extractedData.push({
                        category,
                        method: method.toUpperCase(),
                        path: pathKey,
                        summary,
                        description,
                        parameters,
                        responses
                    });
                }
            }
        }

        const outputJsonPath = `${outputBaseName}.json`;
        fs.writeFileSync(outputJsonPath, JSON.stringify(extractedData, null, 2));
        console.log(`\nSuccessfully extracted API documentation to: ${outputJsonPath}`);

        // Optionally, create a Markdown version for readability
        let md = `# API Documentation: ${inputFilePath}\n\n`;
        extractedData.forEach(item => {
            md += `## [${item.category}] ${item.method} ${item.path}\n`;
            if (item.summary) md += `**Summary:** ${item.summary}\n\n`;
            if (item.description) md += `**Description:** ${item.description}\n\n`;

            if (item.parameters && item.parameters.length > 0) {
                md += `### Parameters\n| Name | In | Description | Required | Type |\n| :--- | :--- | :--- | :--- | :--- |\n`;
                item.parameters.forEach(p => {
                    const schemaType = p.schema ? (p.schema.type || JSON.stringify(p.schema)) : 'any';
                    md += `| ${p.name || ''} | ${p.in || ''} | ${p.description || ''} | ${p.required ? 'Yes' : 'No'} | ${schemaType} |\n`;
                });
                md += `\n`;
            }

            if (item.responses && Object.keys(item.responses).length > 0) {
                md += `### Responses\n`;
                for (const statusCode in item.responses) {
                    const response = item.responses[statusCode];
                    md += `#### ${statusCode} - ${response.description || ''}\n`;
                    if (response.content && response.content['application/json'] && response.content['application/json'].schema) {
                        md += `\`\`\`json\n${JSON.stringify(response.content['application/json'].schema, null, 2)}\n\`\`\`\n`;
                    }
                    md += `\n`;
                }
            }
            md += `---\n\n`;
        });
        const outputMdPath = `${outputBaseName}.md`;
        fs.writeFileSync(outputMdPath, md);
        console.log(`Successfully generated Markdown documentation to: ${outputMdPath}`);

    } catch (e) {
        console.error(`Error parsing OpenAPI spec: ${e.message}`);
    }
}

// Command-line execution
const inputFilePath = process.argv[2];
const outputBaseName = process.argv[3] || 'api_documentation';
if (!inputFilePath) {
    console.log('Usage: node openapi_parser.js <path_to_openapi_json> [output_basename]');
    process.exit(1);
}
parseOpenApiSpec(inputFilePath, outputBaseName);